#!/usr/bin/env python3
"""
Import remaining tables with robust error handling
"""
import mysql.connector
import csv
from pathlib import Path

db_config = {
    'host': 'gateway02.us-east-1.prod.aws.tidbcloud.com',
    'port': 4000,
    'user': '22aWfraQ8tS98ev.root',
    'password': 'G1Ay0h26s6ssgEerqTu2',
    'database': 'SyqFTnEociiwryMADE4XT4',
    'ssl_disabled': False,
}

# Remaining tables to import
remaining_tables = [
    'option_set_values', 'procurement_number_sequences', 'purchase_requests',
    'quotation_analyses', 'rbac_user_permissions', 'suppliers', 
    'system_settings', 'user_permission_overrides', 'variance_alert_history', 
    'vehicles', 'projects'
]

def clean_value(value, column_name=''):
    """Clean and normalize values with special handling"""
    if value is None or value == '':
        return None
    
    # Handle special characters that might cause encoding issues
    if value == '?':
        return None
    
    # Handle boolean-like values
    if value.lower() in ['true', '1']:
        return 1
    if value.lower() in ['false', '0']:
        return 0
    
    return value

def get_table_columns(cursor, table_name):
    """Get column names and types from database"""
    cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
    return {row[0]: row[1] for row in cursor.fetchall()}

def main():
    print('📦 Importing remaining tables with robust handling...\n')
    
    cnx = mysql.connector.connect(**db_config)
    cursor = cnx.cursor()
    
    schema_dir = Path('Schema tables')
    success_count = 0
    error_count = 0
    total_rows = 0
    
    for table_name in remaining_tables:
        csv_file = schema_dir / f'{table_name}.csv'
        if not csv_file.exists():
            print(f'⏭️  {table_name}: CSV file not found')
            continue
        
        try:
            # Read CSV
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            if not rows:
                print(f'⏭️  {table_name}: Empty CSV')
                continue
            
            # Get database column info
            db_columns = get_table_columns(cursor, table_name)
            csv_columns = list(rows[0].keys())
            
            # Only use columns that exist in both CSV and database
            valid_columns = [col for col in csv_columns if col in db_columns]
            
            if not valid_columns:
                print(f'❌ {table_name}: No matching columns')
                error_count += 1
                continue
            
            placeholders = ','.join(['%s'] * len(valid_columns))
            column_names = ','.join([f'`{col}`' for col in valid_columns])
            
            # Clear existing data
            cursor.execute(f'TRUNCATE TABLE `{table_name}`')
            
            # Insert new data row by row with error handling
            query = f'INSERT INTO `{table_name}` ({column_names}) VALUES ({placeholders})'
            inserted = 0
            skipped = 0
            
            for row_idx, row in enumerate(rows, 1):
                values = [clean_value(row.get(col, ''), col) for col in valid_columns]
                try:
                    cursor.execute(query, values)
                    inserted += 1
                except mysql.connector.Error as err:
                    # Skip rows with errors but continue
                    if 'Duplicate entry' not in str(err) and skipped < 3:
                        print(f'  ⚠️  {table_name} row {row_idx}: {str(err)[:80]}')
                    skipped += 1
            
            if inserted > 0:
                cnx.commit()
                msg = f'✅ {table_name}: {inserted} rows imported'
                if skipped > 0:
                    msg += f' ({skipped} skipped)'
                print(msg)
                success_count += 1
                total_rows += inserted
            else:
                print(f'❌ {table_name}: No rows imported ({skipped} errors)')
                error_count += 1
        
        except Exception as e:
            print(f'❌ {table_name}: {str(e)[:100]}')
            error_count += 1
    
    cursor.close()
    cnx.close()
    
    print(f'\n📊 Final Import Summary:')
    print(f'  ✅ Successful: {success_count} tables')
    print(f'  ❌ Failed: {error_count} tables')
    print(f'  📈 Total rows: {total_rows}')
    print(f'\n✅ Import complete!')

if __name__ == '__main__':
    main()
