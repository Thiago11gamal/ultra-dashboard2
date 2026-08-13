import os
import glob
import ftfy

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        fixed_content = ftfy.fix_text(content)
        
        if content != fixed_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"Fixed: {filepath}")
    except Exception as e:
        pass

for filepath in glob.glob(r'd:\Downloads\ultra-patched\src\**\*.js*', recursive=True):
    fix_file(filepath)
