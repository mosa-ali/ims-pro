#!/usr/bin/env python3
"""
Analyze all CSV files and generate ALTER TABLE statements to add missing columns
"""
import csv
from pathlib import Path
import mysql.connector

db_config = {
    'host': 'gateway02.us-east-1.prod.aws.tidbcloud.com',
    'port': 4000,
    'user': '22aWfraQ8tS98ev.root',
    'password': 'G1Ay0h26s6ssgEerqTu2',
    'database': 'SyqFTnEociiwryMADE4XT4',
    'ssl_disabled': False,
}

def get_table_columns(cursor, table_name):
    """Get existing columns in a table"""
    try:
        cursor.execute(f"DESCRIBE `{table_name}`")
        return {row[0].lower() for row in cursor.fetchall()}
    except:
        return set()

def infer_column_type(col_name):
    """Infer MySQL column type from column name"""
    col_lower = col_name.lower()
    
    # ID columns
    if col_name == 'id':
        return 'INT AUTO_INCREMENT PRIMARY KEY'
    if col_name.endswith('Id') or col_name.endswith('_id'):
        return 'INT'
    
    # Boolean columns
    if col_name.startswith('is') or col_name.startswith('has') or col_name.startswith('can'):
        return 'TINYINT(1) DEFAULT 0'
    
    # Date/time columns
    if 'date' in col_lower or col_name.endswith('At'):
        return 'TIMESTAMP NULL'
    
    # Enum/status columns
    if col_name in ['status', 'role', 'type', 'category', 'priority', 'stage']:
        return 'VARCHAR(50)'
    
    # JSON columns
    if col_name.endswith('Json') or col_name.endswith('Data') or col_name == 'permissions':
        return 'TEXT'
    
    # Numeric columns
    if any(word in col_lower for word in ['amount', 'balance', 'budget', 'cost', 'price', 'total', 'value']):
        return 'DECIMAL(15,2)'
    if any(word in col_lower for word in ['count', 'quantity', 'number', 'percent', 'rate']):
        return 'INT'
    
    # Text columns
    if any(word in col_lower for word in ['description', 'notes', 'comment', 'reason', 'details', 'address']):
        return 'TEXT'
    if col_name == 'email':
        return 'VARCHAR(320)'
    if col_name in ['name', 'title']:
        return 'VARCHAR(255)'
    
    # Default
    return 'VARCHAR(255)'

def main():
    print('🔍 Analyzing CSV files and database schema...\n')
    
    cnx = mysql.connector.connect(**db_config)
    cursor = cnx.cursor()
    
    schema_dir = Path('Schema tables')
    csv_files = sorted([f for f in schema_dir.glob('*.csv')])
    
    alter_statements = []
    tables_to_fix = []
    
    for csv_file in csv_files:
        table_name = csv_file.stem
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                csv_columns = set(reader.fieldnames) if reader.fieldnames else set()
            
            if not csv_columns:
                continue
            
            # Get existing table columns
            db_columns = get_table_columns(cursor, table_name)
            
            # Find missing columns
            missing_columns = csv_columns - db_columns
            
            if missing_columns:
                tables_to_fix.append(table_name)
                print(f'📋 {table_name}: {len(missing_columns)} missing columns')
                
                for col in sorted(missing_columns):
                    col_type = infer_column_type(col)
                    alter_statements.append(
                        f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` {col_type};"
                    )
        
        except Exception as e:
            print(f'⚠️  {table_name}: {str(e)[:80]}')
    
    cursor.close()
    cnx.close()
    
    # Write ALTER statements to file
    if alter_statements:
        with open('fix_schema.sql', 'w') as f:
            f.write('-- Fix missing columns in database tables\n\n')
            f.write('\n'.join(alter_statements))
        
        print(f'\n✅ Generated {len(alter_statements)} ALTER statements for {len(tables_to_fix)} tables')
        print(f'📄 Output: fix_schema.sql')
        print(f'\n📋 Tables to fix: {", ".join(tables_to_fix[:10])}{"..." if len(tables_to_fix) > 10 else ""}')
    else:
        print('\n✅ All tables have matching columns!')

if __name__ == '__main__':
    main()
