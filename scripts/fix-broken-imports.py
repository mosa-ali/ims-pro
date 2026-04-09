#!/usr/bin/env python3
"""
Fix files where useTranslation import was inserted inside multi-line imports.
Removes the misplaced import line and re-inserts it after the last complete import.
"""
import re

with open('/tmp/broken_files.txt') as f:
    files = [line.strip() for line in f if line.strip()]

for filepath in files:
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    # Find and remove the misplaced import line
    import_line = "import { useTranslation } from '@/i18n/useTranslation';\n"
    
    # Remove ALL occurrences of the import line
    new_lines = []
    removed = False
    for line in lines:
        if line.strip() == "import { useTranslation } from '@/i18n/useTranslation';":
            removed = True
            continue
        new_lines.append(line)
    
    if not removed:
        print(f"  SKIP {filepath} - import not found")
        continue
    
    # Find the last complete import statement
    # A complete import ends with a line containing ';' and the import block
    # starts with 'import'
    last_complete_import = -1
    in_import = False
    
    for i, line in enumerate(new_lines):
        stripped = line.strip()
        
        if stripped.startswith('import '):
            in_import = True
            if ';' in stripped:  # Single-line import
                last_complete_import = i
                in_import = False
        elif in_import:
            if ';' in stripped:  # End of multi-line import
                last_complete_import = i
                in_import = False
    
    if last_complete_import >= 0:
        new_lines.insert(last_complete_import + 1, import_line)
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        print(f"  FIXED {filepath} (import moved to line {last_complete_import + 2})")
    else:
        # Insert at top
        new_lines.insert(0, import_line)
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        print(f"  FIXED {filepath} (import at top)")
