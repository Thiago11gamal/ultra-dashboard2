import os
import re

md_file = 'codigo_projeto_sem_testes_final.md'

with open(md_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern explanation:
# ## filepath
# optional empty lines
# ```language
# code content
# ```
matches = re.finditer(r'##\s+([^\n]+)\n+```[^\n]*\n(.*?)```', content, re.DOTALL)

count = 0
for match in matches:
    filepath = match.group(1).strip()
    filecontent = match.group(2)
    
    if not filepath:
        continue
        
    print(f"Writing {filepath}...")
    
    dir_name = os.path.dirname(filepath)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
        
    with open(filepath, 'w', encoding='utf-8') as f_out:
        f_out.write(filecontent)
        
    count += 1

print(f"Total files separated: {count}")
