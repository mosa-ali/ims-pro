#!/usr/bin/env python3
"""
Migrate ProcurementWorkspace const L and CasesDashboard const labels
to centralized translations.ts
"""
import re
import os

os.chdir('/home/ubuntu/ims_website')

TRANSLATIONS_FILE = 'client/src/i18n/translations.ts'

def escape_ts(text):
    return text.replace("\\", "\\\\").replace("'", "\\'")

# ============================================================================
# Step 1: Extract ProcurementWorkspace L object
# ============================================================================
with open('client/src/pages/logistics/ProcurementWorkspace.tsx') as f:
    pw_content = f.read()

l_start = pw_content.find('const L = {')
l_end_section = pw_content[l_start:l_start + 5000]
en_match = re.search(r'en:\s*\{([^}]+)\}', l_end_section)
ar_match = re.search(r'ar:\s*\{([^}]+)\}', l_end_section)

en_pairs = re.findall(r'(\w+):\s*"([^"]*)"', en_match.group(1)) if en_match else []
ar_pairs = re.findall(r'(\w+):\s*"([^"]*)"', ar_match.group(1)) if ar_match else []
ar_dict = dict(ar_pairs)

print(f"ProcurementWorkspace: {len(en_pairs)} keys extracted")

# ============================================================================
# Step 2: Extract CasesDashboard labels
# ============================================================================
with open('client/src/pages/organization/projects/tabs/case-management/CasesDashboard.tsx') as f:
    cd_content = f.read()

# Find statusLabels and priorityLabels
status_match = re.search(r'const\s+statusLabels\s*=\s*\{[^}]*en:\s*\{([^}]+)\}[^}]*ar:\s*\{([^}]+)\}\s*\}', cd_content, re.DOTALL)
priority_match = re.search(r'const\s+priorityLabels\s*=\s*\{[^}]*en:\s*\{([^}]+)\}[^}]*ar:\s*\{([^}]+)\}\s*\}', cd_content, re.DOTALL)

cases_en = {}
cases_ar = {}

if status_match:
    for key, val in re.findall(r'(\w+):\s*"([^"]*)"', status_match.group(1)):
        cases_en[f'status{key.capitalize()}'] = val
    for key, val in re.findall(r'(\w+):\s*"([^"]*)"', status_match.group(2)):
        cases_ar[f'status{key.capitalize()}'] = val

if priority_match:
    for key, val in re.findall(r'(\w+):\s*"([^"]*)"', priority_match.group(1)):
        cases_en[f'priority{key.capitalize()}'] = val
    for key, val in re.findall(r'(\w+):\s*"([^"]*)"', priority_match.group(2)):
        cases_ar[f'priority{key.capitalize()}'] = val

print(f"CasesDashboard: {len(cases_en)} label keys extracted")

# ============================================================================
# Step 3: Add procurement namespace to translations.ts
# ============================================================================
with open(TRANSLATIONS_FILE, 'r') as f:
    content = f.read()

# --- Interface ---
# Find the line before "}\n\n// ========== ENGLISH"
interface_marker = '\n}\n\n// ========== ENGLISH'
pos = content.find(interface_marker)
if pos > 0:
    iface_lines = ['  // ========== PROCUREMENT ==========', '  procurement: {']
    for key, val in en_pairs:
        iface_lines.append(f'    {key}: string;')
    iface_lines.append('  };')
    content = content[:pos] + '\n' + '\n'.join(iface_lines) + content[pos:]
    print("Added procurement interface block")

# --- EN block ---
en_end_marker = '\n};\n\n// ========== ARABIC'
pos = content.find(en_end_marker)
if pos > 0:
    en_lines = ['  // ========== PROCUREMENT ==========', '  procurement: {']
    for key, val in en_pairs:
        en_lines.append(f"    {key}: '{escape_ts(val)}',")
    en_lines.append('  },')
    content = content[:pos] + '\n' + '\n'.join(en_lines) + content[pos:]
    print("Added procurement EN block")

# --- AR block ---
# Find the last }; in the file
ar_end = content.rfind('\n};')
if ar_end > 0:
    ar_lines = ['  // ========== PROCUREMENT ==========', '  procurement: {']
    for key, val in en_pairs:
        ar_val = ar_dict.get(key, val)
        ar_lines.append(f"    {key}: '{escape_ts(ar_val)}',")
    ar_lines.append('  },')
    content = content[:ar_end] + '\n' + '\n'.join(ar_lines) + content[ar_end:]
    print("Added procurement AR block")

# ============================================================================
# Step 4: Add CasesDashboard labels to existing caseManagement namespace
# (or create casesDashboard namespace if caseManagement doesn't exist)
# ============================================================================
# Check if caseManagement namespace exists
if 'caseManagement:' in content:
    # Add to existing caseManagement namespace
    # Find interface block
    cm_iface = re.search(r'(  caseManagement:\s*\{[^}]*?)(\n  \};)', content[:content.find('// ========== ENGLISH')])
    if cm_iface:
        new_keys = []
        for key in cases_en:
            if f'    {key}:' not in cm_iface.group(1):
                new_keys.append(f'    {key}: string;')
        if new_keys:
            content = content[:cm_iface.end(1)] + '\n' + '\n'.join(new_keys) + content[cm_iface.end(1):]
            print(f"Added {len(new_keys)} keys to caseManagement interface")
    
    # Find EN block
    en_start = content.find('// ========== ENGLISH')
    ar_start = content.find('// ========== ARABIC')
    en_section = content[en_start:ar_start]
    cm_en = re.search(r'(  caseManagement:\s*\{[^}]*?)(\n  \},)', en_section)
    if cm_en:
        new_vals = []
        for key, val in cases_en.items():
            if f'    {key}:' not in cm_en.group(1):
                new_vals.append(f"    {key}: '{escape_ts(val)}',")
        if new_vals:
            abs_pos = en_start + cm_en.end(1)
            content = content[:abs_pos] + '\n' + '\n'.join(new_vals) + content[abs_pos:]
            print(f"Added {len(new_vals)} EN values to caseManagement")
    
    # Find AR block
    ar_start = content.find('// ========== ARABIC')
    ar_section = content[ar_start:]
    cm_ar = re.search(r'(  caseManagement:\s*\{[^}]*?)(\n  \},)', ar_section)
    if cm_ar:
        new_vals = []
        for key in cases_en:
            ar_val = cases_ar.get(key, cases_en[key])
            if f'    {key}:' not in cm_ar.group(1):
                new_vals.append(f"    {key}: '{escape_ts(ar_val)}',")
        if new_vals:
            abs_pos = ar_start + cm_ar.end(1)
            content = content[:abs_pos] + '\n' + '\n'.join(new_vals) + content[abs_pos:]
            print(f"Added {len(new_vals)} AR values to caseManagement")
else:
    print("caseManagement namespace not found - skipping CasesDashboard labels")

with open(TRANSLATIONS_FILE, 'w') as f:
    f.write(content)

print("\nTranslations file updated!")

# ============================================================================
# Step 5: Update ProcurementWorkspace - remove L, change t.xxx to t.procurement.xxx
# ============================================================================
with open('client/src/pages/logistics/ProcurementWorkspace.tsx') as f:
    pw_content = f.read()

# Remove the entire const L = { ... }; block
l_start = pw_content.find('/* ── Translations')
if l_start == -1:
    l_start = pw_content.find('const L = {')

l_end = pw_content.find('\n/* ── Status Badge', l_start)
if l_end == -1:
    # Find the end of the L block (};)
    l_block_end = pw_content.find('\n};', l_start)
    if l_block_end > 0:
        l_end = l_block_end + 3

if l_start > 0 and l_end > l_start:
    pw_content = pw_content[:l_start] + pw_content[l_end:]
    print(f"Removed const L block ({l_end - l_start} chars)")

# Replace t.xxx with t.procurement.xxx for all procurement keys
for key, val in en_pairs:
    # Match t.key but not t.procurement.key (avoid double-prefixing)
    # Also avoid matching t.someOtherKey that happens to start with our key
    pw_content = re.sub(
        rf'\bt\.{key}\b(?!\.)',
        f't.procurement.{key}',
        pw_content
    )

with open('client/src/pages/logistics/ProcurementWorkspace.tsx', 'w') as f:
    f.write(pw_content)

print("Updated ProcurementWorkspace.tsx")

# ============================================================================
# Step 6: Update CasesDashboard - replace labels with t references
# ============================================================================
with open('client/src/pages/organization/projects/tabs/case-management/CasesDashboard.tsx') as f:
    cd_content = f.read()

# Replace statusLabels[language][key] with t.caseManagement.statusKey
# Replace priorityLabels[language][key] with t.caseManagement.priorityKey
# First, find and remove the const statusLabels and const priorityLabels blocks
for var_name in ['statusLabels', 'priorityLabels']:
    pattern = re.compile(rf'const\s+{var_name}\s*=\s*\{{[^}}]*en:\s*\{{[^}}]+\}}[^}}]*ar:\s*\{{[^}}]+\}}\s*\}};?', re.DOTALL)
    cd_content = pattern.sub(f'// {var_name} moved to centralized translations', cd_content)

# Replace statusLabels[language].xxx with t.caseManagement.statusXxx
cd_content = re.sub(r'statusLabels\[language\]\.(\w+)', lambda m: f't.caseManagement.status{m.group(1).capitalize()}', cd_content)
cd_content = re.sub(r'priorityLabels\[language\]\.(\w+)', lambda m: f't.caseManagement.priority{m.group(1).capitalize()}', cd_content)

# Also handle statusLabels[language]?.[key] pattern
cd_content = re.sub(r'statusLabels\[language\]\?\.\[(\w+)\]', lambda m: f't.caseManagement.status{m.group(1).capitalize()}', cd_content)

with open('client/src/pages/organization/projects/tabs/case-management/CasesDashboard.tsx', 'w') as f:
    f.write(cd_content)

print("Updated CasesDashboard.tsx")
print("\nMigration complete!")
