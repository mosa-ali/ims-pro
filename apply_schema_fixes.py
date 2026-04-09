#!/usr/bin/env python3
"""
Apply ALTER TABLE statements safely, skipping columns that already exist
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

def main():
    print('🔧 Applying schema fixes...\n')
    
    cnx = mysql.connector.connect(**db_config)
    cursor = cnx.cursor()
    
    with open('fix_schema.sql', 'r') as f:
        statements = [line.strip() for line in f if line.strip() and not line.startswith('--')]
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for i, stmt in enumerate(statements, 1):
        try:
            cursor.execute(stmt)
            success_count += 1
            if i % 100 == 0:
                print(f'  ✅ Processed {i}/{len(statements)} statements...')
        except mysql.connector.Error as err:
            if 'Duplicate column' in str(err):
                skip_count += 1
            else:
                error_count += 1
                if error_count <= 10:  # Only show first 10 errors
                    print(f'  ⚠️  Error: {str(err)[:100]}')
    
    cnx.commit()
    cursor.close()
    cnx.close()
    
    print(f'\n📊 Schema Fix Summary:')
    print(f'  ✅ Added: {success_count} columns')
    print(f'  ⏭️  Skipped (already exist): {skip_count} columns')
    print(f'  ❌ Errors: {error_count} columns')
    print(f'\n✅ Schema fixes applied!')

if __name__ == '__main__':
    main()
