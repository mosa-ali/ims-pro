#!/usr/bin/env python3
"""
Mass Translation Migration Script v2
======================================
Extracts inline translation ternaries from all files,
generates centralized translation keys, and replaces
inline patterns with t.namespace.key references.

Handles both new and existing namespaces properly.
"""
import re
import os
import json
import sys
from collections import defaultdict

os.chdir('/home/ubuntu/ims_website')

DRY_RUN = '--dry-run' in sys.argv
EXTRACT_ONLY = '--extract-only' in sys.argv

# ============================================================================
# Namespace mapping
# ============================================================================
def get_namespace(filepath):
    fp = filepath.replace('\\', '/')
    if '/hr/' in fp or '/app/components/hr/' in fp:
        if '/recruitment/' in fp: return 'hrRecruitment'
        if '/annual-plan/' in fp: return 'hrAnnualPlan'
        if '/sanctions/' in fp: return 'hrSanctions'
        if '/attendance/' in fp: return 'hrAttendance'
        if '/employee-cards/' in fp: return 'hrEmployeeCards'
        if '/modals/' in fp: return 'hrModals'
        if 'Payroll' in fp or 'payroll' in fp: return 'hrPayroll'
        if 'Staff' in fp or 'staff' in fp: return 'hrStaff'
        if 'Leave' in fp or 'leave' in fp: return 'hrLeave'
        if 'Reports' in fp or 'reports' in fp: return 'hrReports'
        if 'Settings' in fp or 'settings' in fp: return 'hrSettings'
        return 'hr'
    if '/meal/' in fp:
        if '/tabs/' in fp: return 'mealTabs'
        if 'Survey' in fp or 'survey' in fp: return 'mealSurvey'
        if 'Report' in fp or 'report' in fp: return 'mealReports'
        if 'Document' in fp or 'document' in fp: return 'mealDocuments'
        return 'meal'
    if '/finance/' in fp: return 'financeModule'
    if '/logistics/' in fp: return 'logistics'
    if '/settings/' in fp:
        if 'Email' in fp: return 'emailNotifications'
        if 'Import' in fp: return 'importExport'
        if 'Deleted' in fp: return 'deletedRecords'
        return 'settingsModule'
    if '/platform/' in fp: return 'platformModule'
    if '/organization/' in fp:
        if '/proposals/' in fp: return 'proposals'
        if '/reports/' in fp: return 'orgReports'
        if '/donor-crm/' in fp: return 'donorCRM'
        if '/projects/' in fp: return 'projectDetail'
        return 'organizationModule'
    if '/risk-compliance/' in fp or '/risk/' in fp: return 'riskCompliance'
    if '/components/' in fp:
        if '/procurement/' in fp: return 'procurement'
        if '/finance/' in fp: return 'financeModule'
        if '/logistics/' in fp: return 'logistics'
        if 'Document' in fp: return 'documents'
        if 'Print' in fp or 'print' in fp: return 'printTemplates'
        if 'Report' in fp: return 'reports'
        return 'components'
    return 'common'

def text_to_key(text):
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', text).strip()
    if not clean: return None
    words = clean.split()
    if not words: return None
    if len(words) > 6: words = words[:6]
    key = words[0].lower() + ''.join(w.capitalize() for w in words[1:])
    if not key[0].isalpha(): key = 'k' + key
    return key

# ============================================================================
# Phase 1: Extract inline translations
# ============================================================================
def extract_translations(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    translations = []
    for line_num, line in enumerate(content.split('\n'), 1):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
            continue
        
        # language === "en" ? "en_text" : "ar_text"
        for m in re.finditer(r'''language\s*===\s*['"]en['"]\s*\?\s*(['"])(.*?)\1\s*:\s*(['"])(.*?)\3''', line):
            en_text, ar_text = m.group(2), m.group(4)
            if en_text and ar_text and en_text != ar_text:
                translations.append((en_text, ar_text, m.group(0), line_num))
        
        # language === "ar" ? "ar_text" : "en_text"
        for m in re.finditer(r'''language\s*===\s*['"]ar['"]\s*\?\s*(['"])(.*?)\1\s*:\s*(['"])(.*?)\3''', line):
            ar_text, en_text = m.group(2), m.group(4)
            if en_text and ar_text and en_text != ar_text:
                translations.append((en_text, ar_text, m.group(0), line_num))
        
        # isRTL ? "ar_text" : "en_text"
        for m in re.finditer(r'''isRTL\s*\?\s*(['"])(.*?)\1\s*:\s*(['"])(.*?)\3''', line):
            ar_text, en_text = m.group(2), m.group(4)
            if en_text and ar_text and en_text != ar_text:
                if re.match(r'^[a-z]{2}(-[A-Z]{2})?$', en_text) and re.match(r'^[a-z]{2}(-[A-Z]{2})?$', ar_text):
                    continue
                if ' ' not in en_text and '-' in en_text and ' ' not in ar_text and '-' in ar_text:
                    continue
                translations.append((en_text, ar_text, m.group(0), line_num))
    
    return translations

def collect_all_translations():
    import glob
    files = glob.glob('client/src/**/*.tsx', recursive=True)
    files = [f for f in files if 'node_modules' not in f and '_core' not in f]
    
    ns_translations = defaultdict(dict)
    file_translations = {}
    key_counter = defaultdict(int)
    
    for filepath in sorted(files):
        translations = extract_translations(filepath)
        if not translations: continue
        
        namespace = get_namespace(filepath)
        file_entries = []
        
        for en_text, ar_text, full_match, line_num in translations:
            key = text_to_key(en_text)
            if not key: continue
            
            existing_key = None
            for k, (e, a) in ns_translations[namespace].items():
                if e == en_text and a == ar_text:
                    existing_key = k
                    break
            
            if existing_key:
                key = existing_key
            else:
                base_key = key
                while key in ns_translations[namespace]:
                    key_counter[namespace] += 1
                    key = f"{base_key}{key_counter[namespace]}"
                ns_translations[namespace][key] = (en_text, ar_text)
            
            file_entries.append((en_text, ar_text, full_match, line_num, key, namespace))
        
        if file_entries:
            file_translations[filepath] = file_entries
    
    return ns_translations, file_translations

# ============================================================================
# Phase 2: Add keys to translations.ts using line-by-line insertion
# ============================================================================
def get_existing_keys(lines, ns_name, section_start):
    """Find existing keys in a namespace block starting from section_start"""
    existing = set()
    brace_depth = 0
    in_ns = False
    ns_start = None
    ns_end = None
    
    for i in range(section_start, len(lines)):
        line = lines[i]
        
        # Look for namespace start
        if not in_ns:
            if re.match(rf'^\s+{re.escape(ns_name)}:\s*\{{', line):
                in_ns = True
                brace_depth = line.count('{') - line.count('}')
                ns_start = i
                continue
        else:
            brace_depth += line.count('{') - line.count('}')
            
            # Extract keys
            m = re.match(r'^\s+(\w+):\s', line)
            if m and brace_depth == 1:
                existing.add(m.group(1))
            
            if brace_depth <= 0:
                ns_end = i
                break
    
    return existing, ns_start, ns_end

def add_to_translations_ts(ns_translations):
    with open('client/src/i18n/translations.ts', 'r') as f:
        lines = f.readlines()
    
    content = ''.join(lines)
    
    # Find section boundaries
    interface_start = None
    en_start = None
    ar_start = None
    
    for i, line in enumerate(lines):
        if 'export interface Translations' in line:
            interface_start = i
        elif re.match(r'export const en\s*:\s*Translations', line):
            en_start = i
        elif re.match(r'export const ar\s*:\s*Translations', line):
            ar_start = i
    
    if not all([interface_start is not None, en_start is not None, ar_start is not None]):
        print(f"ERROR: Could not find sections. iface={interface_start}, en={en_start}, ar={ar_start}")
        return False, {}
    
    # Find end of each section (closing };)
    def find_section_end(start_line):
        depth = 0
        for i in range(start_line, len(lines)):
            depth += lines[i].count('{') - lines[i].count('}')
            if depth <= 0 and i > start_line:
                return i
        return len(lines) - 1
    
    interface_end = find_section_end(interface_start)
    en_end = find_section_end(en_start)
    ar_end = find_section_end(ar_start)
    
    # Track namespace name mapping (for existing ns that get renamed)
    ns_name_map = {}  # original_name -> actual_name_in_translations
    
    # Collect all insertions: (line_number, text_to_insert)
    insertions = []
    
    for ns, keys in sorted(ns_translations.items()):
        # Check if namespace exists in each section
        iface_existing, iface_ns_start, iface_ns_end = get_existing_keys(lines, ns, interface_start)
        en_existing, en_ns_start, en_ns_end = get_existing_keys(lines, ns, en_start)
        ar_existing, ar_ns_start, ar_ns_end = get_existing_keys(lines, ns, ar_start)
        
        # Filter to only new keys
        all_existing = iface_existing | en_existing | ar_existing
        new_keys = {k: v for k, v in keys.items() if k not in all_existing}
        
        if not new_keys:
            ns_name_map[ns] = ns
            continue
        
        ns_name_map[ns] = ns
        
        if iface_ns_end is not None:
            # Namespace exists - insert new keys before the closing }
            iface_insert = ''
            for key in sorted(new_keys.keys()):
                iface_insert += f'    {key}: string;\n'
            insertions.append((iface_ns_end, iface_insert))
            
            en_insert = ''
            for key, (en_text, _) in sorted(new_keys.items()):
                escaped = en_text.replace("'", "\\'")
                en_insert += f"    {key}: '{escaped}',\n"
            if en_ns_end is not None:
                insertions.append((en_ns_end, en_insert))
            
            ar_insert = ''
            for key, (_, ar_text) in sorted(new_keys.items()):
                escaped = ar_text.replace("'", "\\'")
                ar_insert += f"    {key}: '{escaped}',\n"
            if ar_ns_end is not None:
                insertions.append((ar_ns_end, ar_insert))
        else:
            # New namespace - insert entire block before section end
            iface_block = f'  {ns}: {{\n'
            for key in sorted(new_keys.keys()):
                iface_block += f'    {key}: string;\n'
            iface_block += '  };\n'
            insertions.append((interface_end, iface_block))
            
            en_block = f'  {ns}: {{\n'
            for key, (en_text, _) in sorted(new_keys.items()):
                escaped = en_text.replace("'", "\\'")
                en_block += f"    {key}: '{escaped}',\n"
            en_block += '  },\n'
            insertions.append((en_end, en_block))
            
            ar_block = f'  {ns}: {{\n'
            for key, (_, ar_text) in sorted(new_keys.items()):
                escaped = ar_text.replace("'", "\\'")
                ar_block += f"    {key}: '{escaped}',\n"
            ar_block += '  },\n'
            insertions.append((ar_end, ar_block))
    
    # Apply insertions in reverse order (bottom to top)
    insertions.sort(key=lambda x: x[0], reverse=True)
    
    for line_num, text in insertions:
        lines.insert(line_num, text)
    
    if not DRY_RUN:
        with open('client/src/i18n/translations.ts', 'w') as f:
            f.writelines(lines)
    
    return True, ns_name_map

# ============================================================================
# Phase 3: Replace inline ternaries in component files
# ============================================================================
def replace_in_files(file_translations, ns_name_map):
    modified_count = 0
    errors = []
    
    for filepath, entries in file_translations.items():
        with open(filepath, 'r') as f:
            content = f.read()
        
        original = content
        
        # Group entries by their full_match to handle duplicates
        # Replace each unique match only once per occurrence
        for en_text, ar_text, full_match, line_num, key, namespace in entries:
            actual_ns = ns_name_map.get(namespace, namespace)
            replacement = f't.{actual_ns}.{key}'
            content = content.replace(full_match, replacement, 1)
        
        if content == original:
            continue
        
        # Add useTranslation import if not present
        if 'useTranslation' not in content:
            import_line = "import { useTranslation } from '@/i18n/useTranslation';"
            lines = content.split('\n')
            
            # Find last import line
            last_import = -1
            for i, line in enumerate(lines):
                if line.strip().startswith('import '):
                    last_import = i
            
            if last_import >= 0:
                lines.insert(last_import + 1, import_line)
            else:
                lines.insert(0, import_line)
            
            content = '\n'.join(lines)
        
        # Add useTranslation() hook call if not present
        if '= useTranslation()' not in content:
            lines = content.split('\n')
            inserted = False
            
            for i, line in enumerate(lines):
                # Match function components
                if re.match(r'\s*(export\s+)?(default\s+)?function\s+\w+', line):
                    # Find the opening brace
                    for j in range(i, min(i + 10, len(lines))):
                        if '{' in lines[j]:
                            # Insert after the opening brace line
                            indent = '  '
                            # Match existing indentation
                            if j + 1 < len(lines):
                                m = re.match(r'^(\s+)', lines[j+1])
                                if m:
                                    indent = m.group(1)
                            lines.insert(j + 1, f'{indent}const {{ t }} = useTranslation();')
                            inserted = True
                            break
                    break
                # Match arrow function components: const X = (...) => {
                elif re.match(r'\s*(export\s+)?(const|let)\s+\w+\s*[:=]', line) and ('=>' in line or '=>' in (lines[i+1] if i+1 < len(lines) else '')):
                    # Find the opening brace of the arrow function body
                    for j in range(i, min(i + 10, len(lines))):
                        if '=>' in lines[j]:
                            # Check if the body starts with {
                            after_arrow = lines[j].split('=>', 1)[1].strip() if '=>' in lines[j] else ''
                            if '{' in after_arrow or (j + 1 < len(lines) and '{' in lines[j+1]):
                                target = j if '{' in after_arrow else j + 1
                                indent = '  '
                                if target + 1 < len(lines):
                                    m = re.match(r'^(\s+)', lines[target+1])
                                    if m: indent = m.group(1)
                                lines.insert(target + 1, f'{indent}const {{ t }} = useTranslation();')
                                inserted = True
                            break
                    break
            
            if not inserted:
                errors.append(f"  WARNING: Could not insert useTranslation() hook in {filepath}")
            
            content = '\n'.join(lines)
        
        if not DRY_RUN:
            with open(filepath, 'w') as f:
                f.write(content)
        
        modified_count += 1
    
    if errors:
        for e in errors[:10]:
            print(e)
    
    return modified_count

# ============================================================================
# Main
# ============================================================================
def main():
    print("Phase 1: Extracting inline translations...")
    ns_translations, file_translations = collect_all_translations()
    
    total_keys = sum(len(keys) for keys in ns_translations.values())
    total_files = len(file_translations)
    total_replacements = sum(len(entries) for entries in file_translations.values())
    
    print(f"  Found {total_keys} unique translation keys across {len(ns_translations)} namespaces")
    print(f"  Found {total_replacements} inline ternaries across {total_files} files")
    
    if EXTRACT_ONLY:
        result = {}
        for ns, keys in sorted(ns_translations.items()):
            result[ns] = {k: {'en': e, 'ar': a} for k, (e, a) in sorted(keys.items())}
        with open('/tmp/extracted_translations.json', 'w') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"\n  Extraction saved to /tmp/extracted_translations.json")
        return
    
    print(f"\nPhase 2: Adding {total_keys} keys to translations.ts...")
    success, ns_name_map = add_to_translations_ts(ns_translations)
    if not success:
        print("  FAILED - aborting")
        return
    print("  Done")
    
    print(f"\nPhase 3: Replacing {total_replacements} inline ternaries in {total_files} files...")
    modified = replace_in_files(file_translations, ns_name_map)
    print(f"  Modified {modified} files")
    
    prefix = '[DRY RUN] ' if DRY_RUN else ''
    print(f"\n{prefix}Migration Summary:")
    print(f"  New translation keys: {total_keys}")
    print(f"  Namespaces: {len(ns_translations)}")
    print(f"  Files modified: {modified}")
    print(f"  Inline ternaries replaced: {total_replacements}")

if __name__ == '__main__':
    main()
