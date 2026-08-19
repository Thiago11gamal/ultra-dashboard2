import os

output_file = 'codigo_fonte_sem_testes.md'
project_root = 'd:\\Downloads\\ultra-patched'
src_dir = os.path.join(project_root, 'src')

def is_test_file(filename):
    return filename.endswith('.test.js') or filename.endswith('.test.jsx') or filename.endswith('.spec.js') or filename.endswith('.spec.jsx')

def get_extension(filename):
    if '.' in filename:
        return filename.split('.')[-1]
    return ''

with open(os.path.join(project_root, output_file), 'w', encoding='utf-8') as outfile:
    outfile.write('# Código Fonte do Projeto (Sem Testes)\n\n')
    
    # Process root config files
    root_files = ['package.json', 'vite.config.js', 'eslint.config.js']
    for rf in root_files:
        fpath = os.path.join(project_root, rf)
        if os.path.exists(fpath):
            outfile.write(f'## {rf}\n\n')
            ext = get_extension(rf)
            if ext == 'json': ext = 'json'
            elif ext == 'js': ext = 'javascript'
            outfile.write(f'```{ext}\n')
            with open(fpath, 'r', encoding='utf-8') as infile:
                outfile.write(infile.read())
            outfile.write('\n```\n\n')

    # Process src directory
    for root, dirs, files in os.walk(src_dir):
        # Exclude __tests__ directories
        if '__tests__' in dirs:
            dirs.remove('__tests__')
            
        for file in files:
            if is_test_file(file):
                continue
                
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, project_root)
            
            # Skip assets/images if any
            ext = get_extension(file)
            if ext in ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico']:
                continue
                
            outfile.write(f'## {rel_path.replace(os.sep, "/")}\n\n')
            
            lang = ext
            if ext in ['js', 'jsx']: lang = 'javascript'
            elif ext in ['ts', 'tsx']: lang = 'typescript'
            elif ext == 'css': lang = 'css'
            elif ext == 'html': lang = 'html'
            elif ext == 'json': lang = 'json'
            
            outfile.write(f'```{lang}\n')
            try:
                with open(file_path, 'r', encoding='utf-8') as infile:
                    outfile.write(infile.read())
            except Exception as e:
                outfile.write(f'// Error reading file: {e}')
            outfile.write('\n```\n\n')

print(f"Successfully created {output_file}")
