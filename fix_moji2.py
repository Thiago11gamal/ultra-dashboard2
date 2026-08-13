import os
import glob

def fix_mojibake(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if it has double encoding
        if 'Ã' in content or 'Ã¡' in content or 'Ã£' in content or 'Ã§' in content:
            fixed = False
            # Fix double encoded utf-8
            try:
                fixed_content = content.encode('windows-1252').decode('utf-8')
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                fixed = True
            except:
                try:
                    fixed_content = content.encode('latin1').decode('utf-8')
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(fixed_content)
                    fixed = True
                except:
                    pass
    except:
        pass

for filepath in glob.glob(r'd:\Downloads\ultra-patched\src\**\*.js*', recursive=True):
    fix_mojibake(filepath)
