#!/usr/bin/env python3
"""
Fix data type issues for tables that failed to import
"""
import mysql.connector

db_config = {
    'host': 'gateway02.us-east-1.prod.aws.tidbcloud.com',
    'port': 4000,
    'user': '22aWfraQ8tS98ev.root',
    'password': 'G1Ay0h26s6ssgEerqTu2',
    'database': 'SyqFTnEociiwryMADE4XT4',
    'ssl_disabled': False,
}

# Tables and columns that need data type fixes
fixes = [
    # Change updatedBy/createdBy/deletedBy from TIMESTAMP to INT
    ("activities", "updatedBy", "INT"),
    ("indicators", "updatedBy", "INT"),
    ("meal_indicator_data_entries", "updatedBy", "INT"),
    ("meal_learning_items", "updatedBy", "INT"),
    ("opportunities", "updatedBy", "INT"),
    ("organization_branding", "updatedBy", "INT"),
    ("procurement_plan", "updatedBy", "INT"),
    ("tasks", "updatedBy", "INT"),
    ("variance_alert_config", "updatedBy", "INT"),
    
    # Change permissions from TEXT to LONGTEXT
    ("rbac_roles", "permissions", "LONGTEXT"),
    ("rbac_user_permissions", "permissions", "LONGTEXT"),
    
    # Change status columns to VARCHAR to accept any value
    ("projects", "status", "VARCHAR(50)"),
]

def main():
    print('🔧 Fixing data type issues...\n')
    
    cnx = mysql.connector.connect(**db_config)
    cursor = cnx.cursor()
    
    success = 0
    errors = 0
    
    for table, column, new_type in fixes:
        try:
            sql = f"ALTER TABLE `{table}` MODIFY COLUMN `{column}` {new_type}"
            cursor.execute(sql)
            print(f'  ✅ {table}.{column} → {new_type}')
            success += 1
        except mysql.connector.Error as err:
            if 'Unknown column' in str(err):
                print(f'  ⏭️  {table}.{column} (column doesn\'t exist)')
            else:
                print(f'  ❌ {table}.{column}: {str(err)[:80]}')
                errors += 1
    
    cnx.commit()
    cursor.close()
    cnx.close()
    
    print(f'\n📊 Summary:')
    print(f'  ✅ Fixed: {success} columns')
    print(f'  ❌ Errors: {errors} columns')
    print(f'\n✅ Data type fixes applied!')

if __name__ == '__main__':
    main()
