#!/usr/bin/env python3
"""
Platform-level RTL/LTR Direction Correction Script
===================================================
Replaces directional Tailwind classes with logical property equivalents
and eliminates isRTL ternaries for direction-related styling.

Mapping:
  text-left  → text-start    text-right → text-end
  ml-X       → ms-X          mr-X       → me-X
  pl-X       → ps-X          pr-X       → pe-X
  left-X     → start-X       right-X    → end-X
  border-l-X → border-s-X    border-r-X → border-e-X
  rounded-l-X→ rounded-s-X   rounded-r-X→ rounded-e-X
  
  isRTL ? 'text-right' : 'text-left' → 'text-start'
  isRTL ? 'text-left' : 'text-right' → 'text-end'
  isRTL ? 'mr-X' : 'ml-X'           → 'ms-X'
  isRTL ? 'ml-X' : 'mr-X'           → 'me-X'
  isRTL ? 'pr-X' : 'pl-X'           → 'ps-X'
  isRTL ? 'pl-X' : 'pr-X'           → 'pe-X'
  isRTL ? 'flex-row-reverse' : ''    → '' (handled by CSS)
  isRTL ? 'flex-row-reverse' : 'flex-row' → 'flex-row' (handled by CSS)
"""
import re
import os
import sys

os.chdir('/home/ubuntu/ims_website')

DRY_RUN = '--dry-run' in sys.argv
VERBOSE = '--verbose' in sys.argv

# ============================================================================
# Pattern 1: Replace isRTL ternaries for directional classes
# ============================================================================
# Patterns: isRTL ? 'rtl-class' : 'ltr-class'
# Also handles: ${isRTL ? 'rtl-class' : 'ltr-class'}
TERNARY_REPLACEMENTS = [
    # text alignment
    (r"""\$\{isRTL\s*\?\s*['"]text-right['"]\s*:\s*['"]text-left['"]\}""", 'text-start'),
    (r"""\$\{isRTL\s*\?\s*['"]text-left['"]\s*:\s*['"]text-right['"]\}""", 'text-end'),
    (r"""isRTL\s*\?\s*['"]text-right['"]\s*:\s*['"]text-left['"]""", "'text-start'"),
    (r"""isRTL\s*\?\s*['"]text-left['"]\s*:\s*['"]text-right['"]""", "'text-end'"),
    
    # margin - isRTL ? 'mr-X' : 'ml-X' → 'ms-X' (start margin)
    (r"""\$\{isRTL\s*\?\s*['"]mr-(\d+)['"]\s*:\s*['"]ml-\d+['"]\}""", r'ms-\1'),
    (r"""\$\{isRTL\s*\?\s*['"]ml-(\d+)['"]\s*:\s*['"]mr-\d+['"]\}""", r'me-\1'),
    (r"""isRTL\s*\?\s*['"]mr-(\d+)['"]\s*:\s*['"]ml-\d+['"]""", r"'ms-\1'"),
    (r"""isRTL\s*\?\s*['"]ml-(\d+)['"]\s*:\s*['"]mr-\d+['"]""", r"'me-\1'"),
    
    # padding
    (r"""\$\{isRTL\s*\?\s*['"]pr-(\d+)['"]\s*:\s*['"]pl-\d+['"]\}""", r'ps-\1'),
    (r"""\$\{isRTL\s*\?\s*['"]pl-(\d+)['"]\s*:\s*['"]pr-\d+['"]\}""", r'pe-\1'),
    (r"""isRTL\s*\?\s*['"]pr-(\d+)['"]\s*:\s*['"]pl-\d+['"]""", r"'ps-\1'"),
    (r"""isRTL\s*\?\s*['"]pl-(\d+)['"]\s*:\s*['"]pr-\d+['"]""", r"'pe-\1'"),
    
    # border
    (r"""\$\{isRTL\s*\?\s*['"]border-r-(\d+)['"]\s*:\s*['"]border-l-\d+['"]\}""", r'border-s-\1'),
    (r"""\$\{isRTL\s*\?\s*['"]border-l-(\d+)['"]\s*:\s*['"]border-r-\d+['"]\}""", r'border-e-\1'),
    (r"""isRTL\s*\?\s*['"]border-r-(\d+)['"]\s*:\s*['"]border-l-\d+['"]""", r"'border-s-\1'"),
    (r"""isRTL\s*\?\s*['"]border-l-(\d+)['"]\s*:\s*['"]border-r-\d+['"]""", r"'border-e-\1'"),
    
    # rounded
    (r"""\$\{isRTL\s*\?\s*['"]rounded-r(-[a-z0-9]+)?['"]\s*:\s*['"]rounded-l(-[a-z0-9]+)?['"]\}""", r'rounded-s\1'),
    (r"""\$\{isRTL\s*\?\s*['"]rounded-l(-[a-z0-9]+)?['"]\s*:\s*['"]rounded-r(-[a-z0-9]+)?['"]\}""", r'rounded-e\1'),
    
    # flex-row-reverse for RTL (now handled by CSS [dir="rtl"])
    # isRTL ? 'flex-row-reverse' : '' → '' (remove, CSS handles it)
    (r"""\$\{isRTL\s*\?\s*['"]flex-row-reverse['"]\s*:\s*['"]['"]?\}""", ''),
    (r"""isRTL\s*\?\s*['"]flex-row-reverse['"]\s*:\s*['"]['"]\s*""", "''"),
    # isRTL ? 'flex-row-reverse' : 'flex-row' → 'flex-row'
    (r"""\$\{isRTL\s*\?\s*['"]flex-row-reverse['"]\s*:\s*['"]flex-row['"]\}""", 'flex-row'),
    (r"""isRTL\s*\?\s*['"]flex-row-reverse['"]\s*:\s*['"]flex-row['"]""", "'flex-row'"),
    
    # space-x-reverse for RTL
    (r"""\$\{isRTL\s*\?\s*['"]space-x-reverse['"]\s*:\s*['"]['"]?\}""", ''),
]

# ============================================================================
# Pattern 2: Replace hardcoded directional Tailwind classes
# ============================================================================
# These are simple string replacements within className strings
DIRECTIONAL_REPLACEMENTS = {
    # Text alignment
    'text-left': 'text-start',
    'text-right': 'text-end',
    # Margin
    'ml-auto': 'ms-auto',
    'mr-auto': 'me-auto',
    # Padding (less common standalone)
    'pl-auto': 'ps-auto',
    'pr-auto': 'pe-auto',
}

# Numeric directional classes: ml-1 → ms-1, mr-2 → me-2, etc.
NUMERIC_PATTERNS = [
    (r'\bml-(\d+(?:\.\d+)?)\b', r'ms-\1'),
    (r'\bmr-(\d+(?:\.\d+)?)\b', r'me-\1'),
    (r'\bpl-(\d+(?:\.\d+)?)\b', r'ps-\1'),
    (r'\bpr-(\d+(?:\.\d+)?)\b', r'pe-\1'),
    (r'\bleft-(\d+(?:\.\d+)?)\b', r'start-\1'),
    (r'\bright-(\d+(?:\.\d+)?)\b', r'end-\1'),
    (r'\bborder-l-(\d+)\b', r'border-s-\1'),
    (r'\bborder-r-(\d+)\b', r'border-e-\1'),
    (r'\brounded-l-(\w+)\b', r'rounded-s-\1'),
    (r'\brounded-r-(\w+)\b', r'rounded-e-\1'),
    (r'\bml-\[([^\]]+)\]\b', r'ms-[\1]'),
    (r'\bmr-\[([^\]]+)\]\b', r'me-[\1]'),
    (r'\bpl-\[([^\]]+)\]\b', r'ps-[\1]'),
    (r'\bpr-\[([^\]]+)\]\b', r'pe-[\1]'),
]

# Files/patterns to SKIP (these need physical direction, not logical)
SKIP_PATTERNS = [
    'ltr-safe',           # Intentionally LTR
    'direction: ltr',     # Intentionally LTR
    'direction: rtl',     # Intentionally RTL
    '.numeric-cell',      # Numbers stay LTR
    'ltr-numbers',        # Numbers stay LTR
]

def should_skip_line(line):
    """Check if a line should be skipped (intentionally directional)"""
    for pattern in SKIP_PATTERNS:
        if pattern in line:
            return True
    return False

def fix_ternaries(content, filepath):
    """Replace isRTL ternary patterns with logical equivalents"""
    changes = 0
    for pattern, replacement in TERNARY_REPLACEMENTS:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            count = len(re.findall(pattern, content))
            changes += count
            content = new_content
    return content, changes

def fix_hardcoded_directional(content, filepath):
    """Replace hardcoded directional classes in className strings"""
    changes = 0
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        if should_skip_line(line):
            new_lines.append(line)
            continue
            
        # Only modify lines that look like JSX className attributes
        if 'className' not in line and 'class=' not in line:
            new_lines.append(line)
            continue
        
        original = line
        
        # Simple word replacements
        for old, new in DIRECTIONAL_REPLACEMENTS.items():
            # Use word boundary to avoid partial matches
            line = re.sub(r'\b' + re.escape(old) + r'\b', new, line)
        
        # Numeric pattern replacements
        for pattern, replacement in NUMERIC_PATTERNS:
            line = re.sub(pattern, replacement, line)
        
        if line != original:
            changes += 1
        
        new_lines.append(line)
    
    return '\n'.join(new_lines), changes

def clean_empty_ternaries(content):
    """Clean up empty ternary results like ${''} or ${ } or className={`... `}"""
    # Remove empty interpolations: ${''}  ${""} 
    content = re.sub(r"\$\{['\"]['\"]?\}", '', content)
    # Remove double spaces from removed ternaries
    content = re.sub(r'  +', ' ', content)
    # Clean up className with only whitespace
    content = re.sub(r'className=\{`\s+`\}', 'className=""', content)
    return content

def process_file(filepath):
    """Process a single file for RTL direction correction"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Step 1: Fix isRTL ternaries
    content, ternary_changes = fix_ternaries(content, filepath)
    
    # Step 2: Fix hardcoded directional classes
    content, directional_changes = fix_hardcoded_directional(content, filepath)
    
    # Step 3: Clean up empty ternaries
    content = clean_empty_ternaries(content)
    
    total_changes = ternary_changes + directional_changes
    
    if content != original and not DRY_RUN:
        with open(filepath, 'w') as f:
            f.write(content)
    
    return ternary_changes, directional_changes

def main():
    import glob
    
    files = glob.glob('client/src/**/*.tsx', recursive=True)
    files += glob.glob('client/src/**/*.ts', recursive=True)
    # Exclude node_modules and _core
    files = [f for f in files if 'node_modules' not in f and '_core' not in f]
    
    total_ternary = 0
    total_directional = 0
    modified_files = 0
    
    for filepath in sorted(files):
        ternary, directional = process_file(filepath)
        if ternary + directional > 0:
            modified_files += 1
            total_ternary += ternary
            total_directional += directional
            if VERBOSE:
                print(f"  {filepath}: {ternary} ternaries, {directional} directional")
    
    print(f"\n{'[DRY RUN] ' if DRY_RUN else ''}RTL Direction Correction Summary:")
    print(f"  Files scanned: {len(files)}")
    print(f"  Files modified: {modified_files}")
    print(f"  Ternary replacements: {total_ternary}")
    print(f"  Directional class replacements: {total_directional}")
    print(f"  Total changes: {total_ternary + total_directional}")

if __name__ == '__main__':
    main()
