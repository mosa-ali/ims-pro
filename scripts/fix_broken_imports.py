"""
Fix broken imports where useLanguage/useTranslation imports were inserted
inside multi-line 'import type {' blocks.

Pattern to fix:
  import type { 
  import { useLanguage } from '...';
  import { useTranslation } from '...';
   SomeType,
   AnotherType
  } from '...';

Should become:
  import { useLanguage } from '...';
  import { useTranslation } from '...';
  import type { 
   SomeType,
   AnotherType
  } from '...';
"""
import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    i = 0
    fixed = False
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this is "import type {" followed by "import {"
        if (line.strip().startswith("import type {") and 
            not line.strip().endswith("};") and
            i + 1 < len(lines) and 
            lines[i+1].strip().startswith("import {")):
            
            # Collect all the misplaced import lines
            misplaced_imports = []
            j = i + 1
            while j < len(lines) and lines[j].strip().startswith("import {"):
                misplaced_imports.append(lines[j])
                j += 1
            
            # Insert misplaced imports BEFORE the type import
            for imp in misplaced_imports:
                new_lines.append(imp)
            new_lines.append(line)
            i = j
            fixed = True
        else:
            new_lines.append(line)
            i += 1
    
    if fixed:
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        return True
    return False

# Find all affected files
count = 0
for root, dirs, files in os.walk("client/src"):
    dirs[:] = [d for d in dirs if d != "node_modules"]
    for fname in files:
        if fname.endswith(('.tsx', '.ts')):
            filepath = os.path.join(root, fname)
            if fix_file(filepath):
                count += 1
                print(f"Fixed: {filepath}")

print(f"\nTotal files fixed: {count}")
