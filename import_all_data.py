#!/usr/bin/env python3
import mysql.connector
import csv
import os
from pathlib import Path
from datetime import datetime

# Database configuration
db_config = {
    'host': 'gateway03.us-east-1.prod.aws.tidbcloud.com',
    'port': 4000,
    'user': '3DLEw35gkkimUcv.root',
    'password': 'H3QADzT1G3dsb0sQY46Q',
    'database': 'ims_dev',
    'ssl_disabled': False,
}

def convert_value(val, col_name):
    """Convert CSV value to appropriate database type"""
    if val == '' or val == 'NULL' or val is None:
        return None
    
    # Handle boolean values
    if val.lower() == 'true':
        return 1
    if val.lower() == 'false':
        return 0
    
    # Handle date/timestamp columns
    if 'date' in col_name.lower() or 'time' in col_name.lower():
        try:
            # Try parsing different date formats
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y']:
                try:
                    dt = datetime.strptime(val, fmt)
                    if 'time' in col_name.lower():
                        return dt.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            return val  # Return as-is if no format matches
        except:
            return val
    
    return val

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
        # Extract table name from filename
        filename = csv_file.name
        table_name = filename.split('_')[0]  # Get the part before the first underscore
        
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
            column_names = ','.join([f'`{col}`' for col in columns])
            query = f'INSERT INTO `{table_name}` ({column_names}) VALUES ({placeholders})'
            
            inserted_count = 0
            skipped_rows = 0
            
            for row in rows:
                values = []
                for col in columns:
                    val = row.get(col, '')
                    converted_val = convert_value(val, col)
                    values.append(converted_val)
                
                try:
                    cursor.execute(query, values)
                    inserted_count += 1
                except mysql.connector.Error as err:
                    error_code = err.errno
                    error_msg = str(err)
                    
                    # Skip duplicate key errors
                    if error_code == 1062 or 'Duplicate entry' in error_msg:
                        skipped_rows += 1
                        continue
                    # Skip foreign key constraint errors
                    elif error_code == 1452 or 'foreign key constraint' in error_msg.lower():
                        skipped_rows += 1
                        continue
                    else:
                        raise
            
            cnx.commit()
            
            if inserted_count > 0:
                print(f'✅ {table_name}: {inserted_count} rows inserted', end='')
                if skipped_rows > 0:
                    print(f' ({skipped_rows} skipped due to constraints)')
                else:
                    print()
                success_count += 1
                total_rows += inserted_count
            else:
                print(f'⏭️  {table_name}: SKIPPED (no rows inserted)')
                skip_count += 1
            
        except Exception as error:
            error_msg = str(error)
            if "doesn't exist" in error_msg or 'no such table' in error_msg:
                print(f'⏭️  {table_name}: SKIPPED (table doesn\'t exist)')
                skip_count += 1
            else:
                print(f'❌ {table_name}: {error_msg[:100]}')
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
