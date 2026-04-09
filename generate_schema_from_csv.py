#!/usr/bin/env python3
import csv
from pathlib import Path

def infer_column_type(col_name, sample_values):
    """Infer MySQL column type from column name and sample values"""
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
    if 'time' in col_lower:
        return 'TIMESTAMP NULL'
    
    # Enum columns (common patterns)
    if col_name == 'status':
        return 'VARCHAR(50)'
    if col_name == 'role':
        return 'VARCHAR(50)'
    if col_name in ['type', 'category', 'priority', 'stage']:
        return 'VARCHAR(100)'
    
    # JSON columns
    if col_name.endswith('Json') or col_name.endswith('Data'):
        return 'JSON'
    
    # Numeric columns
    if any(word in col_lower for word in ['amount', 'balance', 'budget', 'cost', 'price', 'total', 'value']):
        return 'DECIMAL(15,2)'
    if any(word in col_lower for word in ['count', 'quantity', 'number', 'percent', 'rate']):
        return 'INT'
    
    # Text columns
    if any(word in col_lower for word in ['description', 'notes', 'comment', 'reason', 'details']):
        return 'TEXT'
    if col_name == 'email':
        return 'VARCHAR(320)'
    if col_name in ['name', 'title']:
        return 'VARCHAR(255)'
    
    # Default
    return 'VARCHAR(255)'

def generate_create_table(csv_file):
    """Generate CREATE TABLE statement from CSV file"""
    table_name = csv_file.stem
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            columns = reader.fieldnames
            
            # Read first few rows for type inference
            sample_rows = []
            for i, row in enumerate(reader):
                if i >= 5:
                    break
                sample_rows.append(row)
        
        if not columns:
            return None
        
        # Generate column definitions
        col_defs = []
        for col in columns:
            sample_values = [row.get(col, '') for row in sample_rows]
            col_type = infer_column_type(col, sample_values)
            col_defs.append(f"  `{col}` {col_type}")
        
        # Generate CREATE TABLE statement
        create_stmt = f"CREATE TABLE IF NOT EXISTS `{table_name}` (\n"
        create_stmt += ",\n".join(col_defs)
        create_stmt += "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n"
        
        return create_stmt
    
    except Exception as e:
        print(f"Error processing {csv_file.name}: {e}")
        return None

def main():
    schema_dir = Path('Schema tables')
    csv_files = sorted([f for f in schema_dir.glob('*.csv')])
    
    print(f'Found {len(csv_files)} CSV files')
    
    output_file = 'generated_schema.sql'
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("-- Generated schema from CSV files\n")
        out.write("-- Total tables: {}\n\n".format(len(csv_files)))
        
        success_count = 0
        for csv_file in csv_files:
            create_stmt = generate_create_table(csv_file)
            if create_stmt:
                out.write(f"-- Table: {csv_file.stem}\n")
                out.write(create_stmt)
                success_count += 1
                print(f'✅ {csv_file.stem}')
            else:
                print(f'⏭️  {csv_file.stem} (skipped)')
    
    print(f'\n✅ Generated schema for {success_count} tables')
    print(f'📄 Output: {output_file}')

if __name__ == '__main__':
    main()
