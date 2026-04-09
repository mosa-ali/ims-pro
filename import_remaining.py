#!/usr/bin/env python3
"""
Import remaining tables with improved data handling
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

# Tables that previously failed
failed_tables = [
    'activities', 'indicators', 'meal_indicator_data_entries', 'meal_learning_items',
    'opportunities', 'option_set_values', 'organization_branding', 'procurement_number_sequences',
    'procurement_plan', 'projects', 'purchase_requests', 'quotation_analyses',
    'rbac_roles', 'rbac_user_permissions', 'suppliers', 'system_settings',
    'tasks', 'user_organizations', 'user_permission_overrides', 'users',
    'variance_alert_config', 'variance_alert_history', 'vehicles'
]

def clean_value(value):
    """Clean and normalize values"""
    if value is None or value == '':
        return None
    if value == '?':  # Replace placeholder with NULL
        return None
    return value

def main():
    print('📦 Importing remaining tables...\n')
    
    cnx = mysql.connector.connect(**db_config)
    cursor = cnx.cursor()
    
    schema_dir = Path('Schema tables')
    success_count = 0
    error_count = 0
    total_rows = 0
    
    for table_name in failed_tables:
        csv_file = schema_dir / f'{table_name}.csv'
        if not csv_file.exists():
            print(f'⏭️  {table_name}: CSV file not found')
            continue
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            if not rows:
                print(f'⏭️  {table_name}: Empty CSV')
                continue
            
            columns = list(rows[0].keys())
            placeholders = ','.join(['%s'] * len(columns))
            column_names = ','.join([f'`{col}`' for col in columns])
            
            # Clear existing data
            cursor.execute(f'DELETE FROM `{table_name}`')
            
            # Insert new data
            query = f'INSERT INTO `{table_name}` ({column_names}) VALUES ({placeholders})'
            inserted = 0
            
            for row in rows:
                values = [clean_value(row.get(col, '')) for col in columns]
                try:
                    cursor.execute(query, values)
                    inserted += 1
                except mysql.connector.Error as err:
                    if 'Duplicate entry' not in str(err):
                        print(f'  ⚠️  {table_name} row error: {str(err)[:100]}')
                        break
            
            if inserted > 0:
                cnx.commit()
                print(f'✅ {table_name}: {inserted} rows imported')
                success_count += 1
                total_rows += inserted
            else:
                print(f'❌ {table_name}: Failed to import')
                error_count += 1
        
        except Exception as e:
            print(f'❌ {table_name}: {str(e)[:100]}')
            error_count += 1
    
    cursor.close()
    cnx.close()
    
    print(f'\n📊 Import Summary:')
    print(f'  ✅ Successful: {success_count} tables')
    print(f'  ❌ Failed: {error_count} tables')
    print(f'  📈 Total rows: {total_rows}')
    print(f'\n✅ Import complete!')

if __name__ == '__main__':
    main()
