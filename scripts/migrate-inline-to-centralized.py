#!/usr/bin/env python3
"""
Migrate inline translation ternaries to centralized translations.ts

This script:
1. Scans component files for language === 'en' ? 'English' : 'Arabic' patterns
2. Generates unique translation keys
3. Adds keys to the interface, EN, and AR blocks in translations.ts
4. Replaces inline ternaries with t.namespace.key references
"""

import re
import os
import json
import hashlib

TRANSLATIONS_FILE = 'client/src/i18n/translations.ts'

# Files to migrate and their target namespace
FILES_TO_MIGRATE = {
    'client/src/components/DonorCombobox.tsx': 'donorCombobox',
    'client/src/components/DonorProjectLinking.tsx': 'donorProjectLinking',
    'client/src/components/DonorSelector.tsx': 'donorSelector',
    'client/src/components/GrantSelector.tsx': 'grantSelector',
    'client/src/components/ProjectSelector.tsx': 'projectSelector',
    'client/src/pages/logistics/ProcurementWorkspace.tsx': 'procurement',
    'client/src/pages/organization/donor-crm/DonorCRMDashboard.tsx': 'donorCRM',
    'client/src/pages/organization/donor-crm/DonorRegistry.tsx': 'donorRegistry',
    'client/src/pages/organization/donor-crm/DonorReports.tsx': 'donorReports',
    'client/src/pages/organization/projects/tabs/case-management/CasesDashboard.tsx': 'casesDashboard',
    'client/src/pages/settings/RolesPermissions.tsx': 'rolesPermissions',
    'client/src/pages/settings/UserManagement.tsx': 'userMgmt',
}

def camel_case(text):
    """Convert English text to camelCase key"""
    # Remove special chars, keep alphanumeric and spaces
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    words = clean.strip().split()
    if not words:
        return 'unknown'
    result = words[0].lower()
    for w in words[1:]:
        result += w.capitalize()
    # Truncate to reasonable length
    if len(result) > 40:
        result = result[:40]
    return result

def extract_inline_translations(filepath):
    """Extract all inline translation ternaries from a file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Match: language === "en" ? "English text" : "Arabic text"
    # Also: language === 'en' ? 'English text' : 'Arabic text'
    # Handle multiline patterns too
    pattern = re.compile(
        r'''language\s*===\s*["']en["']\s*\?\s*["']((?:[^"'\\]|\\.)*)["']\s*:\s*["']((?:[^"'\\]|\\.)*)["']''',
        re.DOTALL
    )
    
    matches = []
    for m in pattern.finditer(content):
        en_text = m.group(1).strip()
        ar_text = m.group(2).strip()
        full_match = m.group(0)
        matches.append({
            'en': en_text,
            'ar': ar_text,
            'full_match': full_match,
            'start': m.start(),
            'end': m.end(),
        })
    
    return matches

def generate_keys(matches, namespace):
    """Generate unique translation keys for each match"""
    seen_keys = {}
    result = []
    
    for m in matches:
        base_key = camel_case(m['en'])
        if not base_key or base_key == 'unknown':
            # Use hash for non-English-starting strings
            base_key = 'text' + hashlib.md5(m['en'].encode()).hexdigest()[:6]
        
        # Handle duplicates
        key = base_key
        counter = 2
        while key in seen_keys and seen_keys[key] != m['en']:
            key = f"{base_key}{counter}"
            counter += 1
        
        seen_keys[key] = m['en']
        m['key'] = key
        m['namespace'] = namespace
        result.append(m)
    
    return result

def deduplicate_keys(all_entries):
    """Deduplicate entries with same en/ar text within same namespace"""
    seen = {}
    deduped = []
    for entry in all_entries:
        ns_key = (entry['namespace'], entry['en'])
        if ns_key not in seen:
            seen[ns_key] = entry['key']
            deduped.append(entry)
        else:
            # Reuse the same key for duplicate text
            entry['key'] = seen[ns_key]
    return all_entries, deduped

def main():
    os.chdir('/home/ubuntu/ims_website')
    
    all_entries = []
    file_entries = {}
    
    # Step 1: Extract all inline translations
    for filepath, namespace in FILES_TO_MIGRATE.items():
        if not os.path.exists(filepath):
            print(f"SKIP (not found): {filepath}")
            continue
        
        matches = extract_inline_translations(filepath)
        if not matches:
            print(f"SKIP (no inline translations): {filepath}")
            continue
        
        entries = generate_keys(matches, namespace)
        file_entries[filepath] = entries
        all_entries.extend(entries)
        print(f"Found {len(entries)} inline translations in {os.path.basename(filepath)}")
    
    # Step 2: Deduplicate
    all_entries, unique_entries = deduplicate_keys(all_entries)
    
    # Group by namespace
    by_namespace = {}
    for entry in unique_entries:
        ns = entry['namespace']
        if ns not in by_namespace:
            by_namespace[ns] = []
        # Only add if key not already in this namespace's list
        existing_keys = [e['key'] for e in by_namespace[ns]]
        if entry['key'] not in existing_keys:
            by_namespace[ns].append(entry)
    
    # Step 3: Check which namespaces already exist in translations.ts
    with open(TRANSLATIONS_FILE, 'r') as f:
        trans_content = f.read()
    
    # Find existing namespaces
    existing_namespaces = set()
    for ns in by_namespace:
        # Check if namespace exists in interface
        if re.search(rf'\b{ns}\s*:\s*\{{', trans_content):
            existing_namespaces.add(ns)
    
    print(f"\nExisting namespaces: {existing_namespaces}")
    print(f"New namespaces needed: {set(by_namespace.keys()) - existing_namespaces}")
    
    # Step 4: Generate the translation blocks
    print("\n=== INTERFACE ADDITIONS ===")
    for ns, entries in sorted(by_namespace.items()):
        if ns not in existing_namespaces:
            print(f"  // ========== {ns.upper()} ==========")
            print(f"  {ns}: {{")
            for e in entries:
                print(f"    {e['key']}: string;")
            print(f"  }};")
        else:
            print(f"  // Add to existing {ns}:")
            for e in entries:
                print(f"    {e['key']}: string;")
    
    print("\n=== EN ADDITIONS ===")
    for ns, entries in sorted(by_namespace.items()):
        if ns not in existing_namespaces:
            print(f"  {ns}: {{")
        for e in entries:
            en_escaped = e['en'].replace("'", "\\'")
            print(f"    {e['key']}: '{en_escaped}',")
        if ns not in existing_namespaces:
            print(f"  }},")
    
    print("\n=== AR ADDITIONS ===")
    for ns, entries in sorted(by_namespace.items()):
        if ns not in existing_namespaces:
            print(f"  {ns}: {{")
        for e in entries:
            ar_escaped = e['ar'].replace("'", "\\'")
            print(f"    {e['key']}: '{ar_escaped}',")
        if ns not in existing_namespaces:
            print(f"  }},")
    
    # Step 5: Generate replacement map for each file
    print("\n=== REPLACEMENTS PER FILE ===")
    for filepath, entries in file_entries.items():
        print(f"\n{os.path.basename(filepath)}: {len(entries)} replacements")
        for e in entries[:5]:
            print(f"  {e['full_match'][:60]}... -> t.{e['namespace']}.{e['key']}")
        if len(entries) > 5:
            print(f"  ... and {len(entries) - 5} more")
    
    # Save the migration data for the actual replacement step
    migration_data = {
        'by_namespace': {ns: [{'key': e['key'], 'en': e['en'], 'ar': e['ar']} for e in entries] for ns, entries in by_namespace.items()},
        'file_entries': {fp: [{'key': e['key'], 'namespace': e['namespace'], 'full_match': e['full_match']} for e in entries] for fp, entries in file_entries.items()},
        'existing_namespaces': list(existing_namespaces),
    }
    
    with open('/tmp/migration_data.json', 'w') as f:
        json.dump(migration_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nMigration data saved to /tmp/migration_data.json")
    print(f"Total unique keys: {sum(len(v) for v in by_namespace.values())}")
    print(f"Total replacements: {sum(len(v) for v in file_entries.values())}")

if __name__ == '__main__':
    main()
