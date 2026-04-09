#!/usr/bin/env python3
import mysql.connector
import csv
import os
from pathlib import Path

# Database configuration
db_config = {
    'host': 'gateway03.us-east-1.prod.aws.tidbcloud.com',
    'port': 4000,
    'user': '3DLEw35gkkimUcv.root',
    'password': 'H3QADzT1G3dsb0sQY46Q',
    'database': 'ims_dev',
    'ssl_disabled': False,
}

def import_csv_data():
    print('📡 Connecting to TiDB Cloud (ims_dev)...')
    
    try:
        cnx = mysql.connector.connect(**db_config)
        cursor = cnx.cursor()
        print('✅ Connected successfully!\n')
    except Exception as e:
        print(f'❌ Connection failed: {e}')
        return
    
    schema_dir = Path('/home/ubuntu/ims_website/Schema tables')
    csv_files = sorted([f for f in schema_dir.glob('*.csv')])
    
    print(f'📋 Found {len(csv_files)} CSV files to import\n')
    
    success_count = 0
    skip_count = 0
    error_count = 0
    total_rows = 0
    
    for csv_file in csv_files:
        table_name = csv_file.name.replace(csv_file.name.split('_')[0], '').lstrip('_')
        table_name = '_'.join(table_name.split('_')[:-2])  # Remove timestamp
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            if not rows:
                print(f'⏭️  {table_name}: SKIPPED (empty)')
                skip_count += 1
                continue
            
            columns = list(rows[0].keys())
            placeholders = ','.join(['%s'] * len(columns))
            column_names = ','.join(columns)
            query = f'INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})'
            
            inserted_count = 0
            for row in rows:
                values = []
                for col in columns:
                    val = row.get(col)
                    if val == '' or val == 'NULL' or val is None:
                        values.append(None)
                    elif val == 'true':
                        values.append(1)
                    elif val == 'false':
                        values.append(0)
                    else:
                        values.append(val)
                
                try:
                    cursor.execute(query, values)
                    inserted_count += 1
                except mysql.connector.Error as err:
                    if 'Duplicate entry' not in str(err):
                        raise
            
            cnx.commit()
            print(f'✅ {table_name}: {inserted_count}/{len(rows)} rows inserted')
            success_count += 1
            total_rows += inserted_count
            
        except Exception as error:
            error_msg = str(error)
            if "doesn't exist" in error_msg or 'no such table' in error_msg:
                print(f'⏭️  {table_name}: SKIPPED (table doesn\'t exist)')
                skip_count += 1
            else:
                print(f'❌ {table_name}: {error_msg[:80]}')
                error_count += 1
    
    print(f'\n📊 Import Summary:')
    print(f'   ✅ Successful tables: {success_count}')
    print(f'   ⏭️  Skipped tables: {skip_count}')
    print(f'   ❌ Error tables: {error_count}')
    print(f'   📈 Total rows inserted: {total_rows}')
    print(f'\n✅ Data import complete!')
    
    cursor.close()
    cnx.close()

if __name__ == '__main__':
    import_csv_data()
