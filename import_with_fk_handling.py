#!/usr/bin/env python3
"""
Import remaining tables with foreign key constraint handling
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

# Remaining tables - ordered by dependency (least dependent first)
remaining_tables = [
    'option_set_values', 'procurement_number_sequences', 'suppliers', 
    'system_settings', 'vehicles', 'projects',  # Projects last due to FK
    'purchase_requests', 'quotation_analyses', 'rbac_user_permissions',
    'user_permission_overrides', 'variance_alert_history'
]

def main():
    print('📦 Importing remaining tables (with FK handling)...\n')
    
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
        csv_file = schema_dir / f'{table_name}.csv'
        if not csv_file.exists():
            continue
        
        try:
            # Read CSV
            with open(csv_file, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            if not rows:
                continue
            
            csv_columns = list(rows[0].keys())
            placeholders = ','.join(['%s'] * len(csv_columns))
            column_names = ','.join([f'`{col}`' for col in csv_columns])
            
            # Delete existing data (instead of TRUNCATE to avoid FK issues)
            cursor.execute(f'DELETE FROM `{table_name}`')
            
            # Insert new data
            query = f'INSERT INTO `{table_name}` ({column_names}) VALUES ({placeholders})'
            inserted = 0
            errors = 0
            
            for row in rows:
                values = [row.get(col, None) if row.get(col, '') != '' else None for col in csv_columns]
                try:
                    cursor.execute(query, values)
                    inserted += 1
                except mysql.connector.Error:
                    errors += 1
                    # Continue with next row
            
            if inserted > 0:
                cnx.commit()
                if errors == 0:
                    print(f'✅ {table_name}: {inserted} rows imported')
                    success_count += 1
                else:
                    print(f'⚠️  {table_name}: {inserted} rows imported ({errors} errors)')
                    partial_count += 1
                total_rows += inserted
            else:
                print(f'❌ {table_name}: Failed ({errors} errors)')
                error_count += 1
        
        except Exception as e:
            print(f'❌ {table_name}: {str(e)[:80]}')
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
