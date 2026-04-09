#!/usr/bin/env python3
"""
Import all remaining tables with data cleaning and validation
"""
import mysql.connector
import csv
import re
from pathlib import Path
from datetime import datetime

db_config = {
    'host': 'gateway02.us-east-1.prod.aws.tidbcloud.com',
    'port': 4000,
    'user': '22aWfraQ8tS98ev.root',
    'password': 'G1Ay0h26s6ssgEerqTu2',
    'database': 'SyqFTnEociiwryMADE4XT4',
    'ssl_disabled': False,
}

# All remaining tables including grants
remaining_tables = [
    'grants', 'grant_documents',  # Grant data
    'option_set_values', 'procurement_number_sequences', 'suppliers', 
    'system_settings', 'vehicles', 
    'purchase_requests', 'quotation_analyses', 'rbac_user_permissions',
    'user_permission_overrides', 'variance_alert_history'
]

def clean_value(value, column_name='', column_type=''):
    """Clean and normalize values with intelligent handling"""
    if value is None or value == '':
        return None
    
    # Convert to string for processing
    value_str = str(value).strip()
    
    # Handle empty or placeholder values
    if value_str in ['', '?', 'NULL', 'null', 'None']:
        return None
    
    # Handle boolean-like values
    if value_str.lower() in ['true', 'yes', '1']:
        return 1
    if value_str.lower() in ['false', 'no', '0']:
        return 0
    
    # Handle numeric columns
    if 'int' in column_type.lower() or 'decimal' in column_type.lower():
        try:
            if '.' in value_str:
                return float(value_str)
            return int(value_str)
        except:
            return None
    
    # Handle date/timestamp columns
    if 'date' in column_type.lower() or 'timestamp' in column_type.lower():
        # Check if it's a user ID (numeric) instead of date
        if value_str.isdigit():
            return None
        try:
            # Try parsing as date
            datetime.strptime(value_str, '%Y-%m-%d %H:%M:%S')
            return value_str
        except:
            return None
    
    # Return cleaned string
    return value_str

def get_table_info(cursor, table_name):
    """Get column names and types from database"""
    cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
    return {row[0]: row[1] for row in cursor.fetchall()}

def import_table(cursor, cnx, table_name, schema_dir):
    """Import a single table with data cleaning"""
    csv_file = schema_dir / f'{table_name}.csv'
    if not csv_file.exists():
        return None, 'CSV file not found'
    
    try:
        # Read CSV
        with open(csv_file, 'r', encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        
        if not rows:
            return None, 'Empty CSV'
        
        # Get database column info
        db_columns = get_table_info(cursor, table_name)
        csv_columns = list(rows[0].keys())
        
        # Only use columns that exist in both CSV and database
        valid_columns = [col for col in csv_columns if col in db_columns]
        
        if not valid_columns:
            return None, 'No matching columns'
        
        placeholders = ','.join(['%s'] * len(valid_columns))
        column_names = ','.join([f'`{col}`' for col in valid_columns])
        
        # Delete existing data (instead of TRUNCATE to avoid FK issues)
        cursor.execute(f'DELETE FROM `{table_name}`')
        
        # Insert new data row by row with cleaning
        query = f'INSERT INTO `{table_name}` ({column_names}) VALUES ({placeholders})'
        inserted = 0
        skipped = 0
        
        for row in rows:
            values = []
            for col in valid_columns:
                raw_value = row.get(col, '')
                col_type = db_columns.get(col, '')
                cleaned = clean_value(raw_value, col, col_type)
                values.append(cleaned)
            
            try:
                cursor.execute(query, values)
                inserted += 1
            except mysql.connector.Error as err:
                skipped += 1
                # Only print first few errors
                if skipped <= 3:
                    print(f'  ⚠️  Row error: {str(err)[:80]}')
        
        if inserted > 0:
            cnx.commit()
            return inserted, skipped
        else:
            return None, f'{skipped} errors'
    
    except Exception as e:
        return None, str(e)[:80]

def main():
    print('📦 Importing all remaining tables with data cleaning...\n')
    
    cnx = mysql.connector.connect(**db_config)
    cursor = cnx.cursor()
    
    # Disable foreign key checks
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0')
    
    schema_dir = Path('Schema tables')
    success_count = 0
    partial_count = 0
    error_count = 0
    total_rows = 0
    
    for table_name in remaining_tables:
        result, info = import_table(cursor, cnx, table_name, schema_dir)
        
        if result is not None:
            if info == 0:
                print(f'✅ {table_name}: {result} rows imported')
                success_count += 1
            else:
                print(f'⚠️  {table_name}: {result} rows imported ({info} skipped)')
                partial_count += 1
            total_rows += result
        else:
            print(f'❌ {table_name}: {info}')
            error_count += 1
    
    # Re-enable foreign key checks
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1')
    
    cursor.close()
    cnx.close()
    
    print(f'\n📊 Final Import Summary:')
    print(f'  ✅ Fully successful: {success_count} tables')
    print(f'  ⚠️  Partially successful: {partial_count} tables')
    print(f'  ❌ Failed: {error_count} tables')
    print(f'  📈 Total rows: {total_rows}')
    print(f'\n✅ Import complete!')

if __name__ == '__main__':
    main()
