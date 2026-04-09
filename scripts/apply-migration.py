#!/usr/bin/env python3
"""
Apply the migration: add keys to translations.ts and replace inline ternaries in component files.
"""

import json
import re
import os

os.chdir('/home/ubuntu/ims_website')

TRANSLATIONS_FILE = 'client/src/i18n/translations.ts'

# Load migration data
with open('/tmp/migration_data.json') as f:
    data = json.load(f)

by_namespace = data['by_namespace']
file_entries = data['file_entries']
existing_namespaces = set(data['existing_namespaces'])

# Skip locale code entries (en-US/ar-SA are not translatable strings)
SKIP_KEYS = set()
for ns, entries in by_namespace.items():
    for e in entries:
        if e['en'] in ('en-US', 'ar-SA') or 'en-US' == e['en']:
            SKIP_KEYS.add((ns, e['key']))
            print(f"SKIP locale code: {ns}.{e['key']}")

# ============================================================================
# Step 1: Add new namespaces and keys to translations.ts
# ============================================================================
with open(TRANSLATIONS_FILE, 'r') as f:
    content = f.read()

# Find insertion points
# Interface: find the closing "}" of the Translations interface (before "// ========== ENGLISH")
# EN: find the closing "};" of the en export (before "// ========== ARABIC")  
# AR: find the closing "};" of the ar export (at end of file)

def escape_ts(text):
    """Escape text for TypeScript string literals"""
    return text.replace("\\", "\\\\").replace("'", "\\'")

# Build blocks for new namespaces
new_ns = {ns: entries for ns, entries in by_namespace.items() if ns not in existing_namespaces}
existing_ns_additions = {ns: entries for ns, entries in by_namespace.items() if ns in existing_namespaces}

# --- Add new namespace interfaces ---
if new_ns:
    # Find the end of the interface (before the closing })
    # Look for the pattern: line with just "}" before "// ========== ENGLISH"
    interface_end = content.find('\n}\n\n// ========== ENGLISH')
    if interface_end == -1:
        interface_end = content.find('\n}\n\n// ==========')
    
    if interface_end > 0:
        new_interface_lines = []
        for ns, entries in sorted(new_ns.items()):
            new_interface_lines.append(f'  // ========== {ns.upper()} ==========')
            new_interface_lines.append(f'  {ns}: {{')
            for e in entries:
                if (ns, e['key']) not in SKIP_KEYS:
                    new_interface_lines.append(f"    {e['key']}: string;")
            new_interface_lines.append('  };')
        
        insert_text = '\n'.join(new_interface_lines) + '\n'
        content = content[:interface_end] + '\n' + insert_text + content[interface_end:]
        print(f"Added {len(new_ns)} new namespace interfaces")

# --- Add keys to existing namespace interfaces ---
for ns, entries in existing_ns_additions.items():
    # Find the closing }; of this namespace in the interface
    # Pattern: find "  ns: {" then find the matching "  };"
    ns_pattern = re.compile(rf'(\s+{ns}:\s*\{{[^}}]*?)(\n\s+\}};)', re.DOTALL)
    match = ns_pattern.search(content[:content.find('// ========== ENGLISH')])
    if match:
        existing_block = match.group(1)
        # Check which keys already exist
        new_keys = []
        for e in entries:
            if (ns, e['key']) not in SKIP_KEYS:
                if f"    {e['key']}:" not in existing_block:
                    new_keys.append(f"    {e['key']}: string;")
        
        if new_keys:
            insert = '\n'.join(new_keys)
            content = content[:match.end(1)] + '\n' + insert + content[match.end(1):]
            print(f"Added {len(new_keys)} keys to {ns} interface")

# --- Add EN values ---
# For new namespaces, add complete blocks before the closing };
en_end_marker = '\n};\n\n// ========== ARABIC'
en_end = content.find(en_end_marker)

if new_ns and en_end > 0:
    new_en_lines = []
    for ns, entries in sorted(new_ns.items()):
        new_en_lines.append(f'  // ========== {ns.upper()} ==========')
        new_en_lines.append(f'  {ns}: {{')
        for e in entries:
            if (ns, e['key']) not in SKIP_KEYS:
                new_en_lines.append(f"    {e['key']}: '{escape_ts(e['en'])}',")
        new_en_lines.append('  },')
    
    insert_text = '\n'.join(new_en_lines) + '\n'
    content = content[:en_end] + '\n' + insert_text + content[en_end:]
    print(f"Added {len(new_ns)} new EN namespace blocks")

# For existing namespaces, add keys to existing blocks
for ns, entries in existing_ns_additions.items():
    # Find the EN block for this namespace - search after "// ========== ENGLISH"
    en_start = content.find('// ========== ENGLISH')
    ar_start = content.find('// ========== ARABIC')
    en_section = content[en_start:ar_start]
    
    ns_pattern = re.compile(rf'(\s+{ns}:\s*\{{[^}}]*?)(\n\s+\}},)', re.DOTALL)
    match = ns_pattern.search(en_section)
    if match:
        existing_block = match.group(1)
        new_keys = []
        for e in entries:
            if (ns, e['key']) not in SKIP_KEYS:
                if f"    {e['key']}:" not in existing_block:
                    new_keys.append(f"    {e['key']}: '{escape_ts(e['en'])}',")
        
        if new_keys:
            abs_pos = en_start + match.end(1)
            insert = '\n'.join(new_keys)
            content = content[:abs_pos] + '\n' + insert + content[abs_pos:]
            print(f"Added {len(new_keys)} EN values to {ns}")

# --- Add AR values ---
# For new namespaces
ar_start_marker = '// ========== ARABIC'
ar_start = content.find(ar_start_marker)
ar_end = content.rfind('\n};')

if new_ns and ar_end > ar_start:
    new_ar_lines = []
    for ns, entries in sorted(new_ns.items()):
        new_ar_lines.append(f'  // ========== {ns.upper()} ==========')
        new_ar_lines.append(f'  {ns}: {{')
        for e in entries:
            if (ns, e['key']) not in SKIP_KEYS:
                new_ar_lines.append(f"    {e['key']}: '{escape_ts(e['ar'])}',")
        new_ar_lines.append('  },')
    
    insert_text = '\n'.join(new_ar_lines) + '\n'
    content = content[:ar_end] + '\n' + insert_text + content[ar_end:]
    print(f"Added {len(new_ns)} new AR namespace blocks")

# For existing namespaces
for ns, entries in existing_ns_additions.items():
    ar_start = content.find('// ========== ARABIC')
    ar_section = content[ar_start:]
    
    ns_pattern = re.compile(rf'(\s+{ns}:\s*\{{[^}}]*?)(\n\s+\}},)', re.DOTALL)
    match = ns_pattern.search(ar_section)
    if match:
        existing_block = match.group(1)
        new_keys = []
        for e in entries:
            if (ns, e['key']) not in SKIP_KEYS:
                if f"    {e['key']}:" not in existing_block:
                    new_keys.append(f"    {e['key']}: '{escape_ts(e['ar'])}',")
        
        if new_keys:
            abs_pos = ar_start + match.end(1)
            insert = '\n'.join(new_keys)
            content = content[:abs_pos] + '\n' + insert + content[abs_pos:]
            print(f"Added {len(new_keys)} AR values to {ns}")

with open(TRANSLATIONS_FILE, 'w') as f:
    f.write(content)

print(f"\nTranslations file updated!")

# ============================================================================
# Step 2: Replace inline ternaries in component files
# ============================================================================
for filepath, entries in file_entries.items():
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r') as f:
        file_content = f.read()
    
    replaced = 0
    skipped = 0
    
    for e in entries:
        ns = e['namespace']
        key = e['key']
        full_match = e['full_match']
        
        if (ns, key) in SKIP_KEYS:
            skipped += 1
            continue
        
        replacement = f't.{ns}.{key}'
        
        if full_match in file_content:
            file_content = file_content.replace(full_match, replacement, 1)
            replaced += 1
    
    # Ensure the file imports useTranslation if it doesn't already
    if replaced > 0:
        # Check if t is already available from useTranslation
        has_use_translation = 'useTranslation()' in file_content or 'useTranslation' in file_content
        
        if not has_use_translation:
            # Add import
            first_import = file_content.find('import ')
            if first_import >= 0:
                file_content = file_content[:first_import] + \
                    'import { useTranslation } from "@/i18n/useTranslation";\n' + \
                    file_content[first_import:]
        
        with open(filepath, 'w') as f:
            f.write(file_content)
        
        print(f"  {os.path.basename(filepath)}: {replaced} replaced, {skipped} skipped")

print("\nMigration complete!")
