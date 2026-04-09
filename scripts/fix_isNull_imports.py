"""
Fix missing isNull imports in all router and db files.
Adds isNull (and isNotNull if used) to the drizzle-orm import.
"""
import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if file uses isNull but doesn't import it
    uses_isNull = 'isNull(' in content
    uses_isNotNull = 'isNotNull(' in content
    
    if not uses_isNull and not uses_isNotNull:
        return False
    
    # Check if already imported
    has_isNull_import = bool(re.search(r'import\s*{[^}]*\bisNull\b[^}]*}\s*from\s*["\']drizzle-orm["\']', content))
    has_isNotNull_import = bool(re.search(r'import\s*{[^}]*\bisNotNull\b[^}]*}\s*from\s*["\']drizzle-orm["\']', content))
    
    needs_isNull = uses_isNull and not has_isNull_import
    needs_isNotNull = uses_isNotNull and not has_isNotNull_import
    
    if not needs_isNull and not needs_isNotNull:
        return False
    
    # Find the drizzle-orm import line and add the missing imports
    def add_to_import(match):
        imports = match.group(1)
        additions = []
        if needs_isNull and 'isNull' not in imports:
            additions.append('isNull')
        if needs_isNotNull and 'isNotNull' not in imports:
            additions.append('isNotNull')
        if additions:
            imports = imports.rstrip()
            if imports.endswith(','):
                imports = imports + ' ' + ', '.join(additions)
            else:
                imports = imports + ', ' + ', '.join(additions)
        return f'import {{ {imports} }} from "drizzle-orm"'
    
    new_content = re.sub(
        r'import\s*\{([^}]*)\}\s*from\s*["\']drizzle-orm["\']',
        add_to_import,
        content,
        count=1
    )
    
    if new_content == content:
        # No drizzle-orm import found, add one at the top after existing imports
        lines = content.split('\n')
        last_import = 0
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import = i
        additions = []
        if needs_isNull:
            additions.append('isNull')
        if needs_isNotNull:
            additions.append('isNotNull')
        import_line = f'import {{ {", ".join(additions)} }} from "drizzle-orm";'
        lines.insert(last_import + 1, import_line)
        new_content = '\n'.join(lines)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    return True

count = 0
for root, dirs, files in os.walk("server"):
    if 'node_modules' in root:
        continue
    for fname in files:
        if fname.endswith('.ts') and not fname.endswith('.test.ts'):
            filepath = os.path.join(root, fname)
            if fix_file(filepath):
                count += 1
                print(f"Fixed: {filepath}")

print(f"\nTotal files fixed: {count}")
