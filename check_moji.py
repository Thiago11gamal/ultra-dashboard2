import os
import glob

def check_mojibake(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'Ã' in content or 'Ã¡' in content or 'Ã£' in content or 'Ã§' in content:
                print(f"Mojibake found in {filepath}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

for filepath in glob.glob(r'd:\Downloads\ultra-patched\src\**\*.js*', recursive=True):
    check_mojibake(filepath)
