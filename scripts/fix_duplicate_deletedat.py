"""
Fix duplicate deletedAt lines in router files.
Patterns:
1. deletedAt: new Date(), followed by deletedAt: new Date(), -> keep one as new Date().toISOString()
2. deletedAt: new Date(), followed by deletedAt: new Date().toISOString(), -> keep only the toISOString one
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
        
        # Check for duplicate deletedAt on consecutive lines
        if i + 1 < len(lines) and 'deletedAt:' in line and 'deletedAt:' in lines[i+1]:
            # Keep the one with toISOString, or convert to toISOString
            if 'toISOString' in lines[i+1]:
                # Skip first line (plain new Date()), keep second (toISOString)
                new_lines.append(lines[i+1])
                i += 2
                fixed = True
            elif 'toISOString' in line:
                # Keep first (toISOString), skip second
                new_lines.append(line)
                i += 2
                fixed = True
            else:
                # Both are plain new Date() - keep one but convert to string format
                indent = len(line) - len(line.lstrip())
                new_lines.append(' ' * indent + 'deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),\n')
                i += 2
                fixed = True
        elif 'deletedAt: new Date(),' in line and 'toISOString' not in line:
            # Single deletedAt with plain new Date() - convert to string
            indent = len(line) - len(line.lstrip())
            new_lines.append(' ' * indent + 'deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),\n')
            i += 1
            fixed = True
        else:
            new_lines.append(line)
            i += 1
    
    if fixed:
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        return True
    return False

count = 0
for root, dirs, files in os.walk("server/routers"):
    for fname in files:
        if fname.endswith(('.ts',)) and not fname.endswith('.test.ts'):
            filepath = os.path.join(root, fname)
            if fix_file(filepath):
                count += 1
                print(f"Fixed: {filepath}")

# Also fix db.ts
if fix_file("server/db.ts"):
    count += 1
    print("Fixed: server/db.ts")

print(f"\nTotal files fixed: {count}")
