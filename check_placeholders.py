#!/usr/bin/env python3
"""
Check placeholder values in failed tables
"""
import csv
from pathlib import Path

failed_tables = [
    'option_set_values', 'procurement_number_sequences', 'purchase_requests',
    'quotation_analyses', 'rbac_user_permissions', 'suppliers', 
    'system_settings', 'user_permission_overrides', 'variance_alert_history', 
    'vehicles', 'projects'
]

schema_dir = Path('Schema tables')

for table in failed_tables:
    csv_file = schema_dir / f'{table}.csv'
    if not csv_file.exists():
        continue
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    if not rows:
        continue
    
    # Find columns with '?' values
    columns_with_placeholder = set()
    for row in rows:
        for col, val in row.items():
            if val == '?':
                columns_with_placeholder.add(col)
    
    if columns_with_placeholder:
        print(f"\n{table}:")
        print(f"  Rows: {len(rows)}")
        print(f"  Columns with '?': {', '.join(sorted(columns_with_placeholder))}")
