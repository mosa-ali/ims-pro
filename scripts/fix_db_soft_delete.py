import re

with open("server/db.ts", "r") as f:
    content = f.read()

# Add isNull to import if not already there
if "isNull" not in content:
    def add_isNull(m):
        imports = m.group(1)
        if 'isNull' not in imports:
            return f'import {{{imports}, isNull}} from "drizzle-orm"'
        return m.group(0)
    content = re.sub(
        r'import\s*\{([^}]+)\}\s*from\s*"drizzle-orm"',
        add_isNull,
        content,
        count=1
    )

# Replace eq(table.isDeleted, false) with isNull(table.deletedAt) for query WHERE clauses
content = re.sub(
    r'eq\((\w+)\.isDeleted,\s*(?:false|0)\)',
    r'isNull(\1.deletedAt)',
    content
)

with open("server/db.ts", "w") as f:
    f.write(content)

# Count results
pattern = re.compile(r'isNull\(\w+\.deletedAt\)')
count = len(pattern.findall(content))
print(f"isNull(*.deletedAt) patterns: {count}")

remaining_pattern = re.compile(r'eq\(\w+\.isDeleted')
remaining = len(remaining_pattern.findall(content))
print(f"Remaining eq(*.isDeleted, ...) patterns: {remaining}")
