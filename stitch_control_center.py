import re

with open('d:/Downloads/ultra-patched/part3_full.txt', 'r', encoding='utf-8') as f:
    text3 = f.read()

m2 = re.search(r'`components/coach/CoachControlCenter\.jsx`.*?```jsx\n(.*)', text3, re.DOTALL)
if m2:
    code_part1 = m2.group(1)
    # Remove the truncation message
    code_part1 = re.sub(r'<truncated.*?$', '', code_part1, flags=re.DOTALL)
else:
    print("Could not find CoachControlCenter.jsx in part 3.")
    exit(1)

with open('d:/Downloads/ultra-patched/part4.txt', 'r', encoding='utf-8') as f:
    text4 = f.read()

# part 4 contains the code directly, it might be wrapped in ```jsx or just have <USER_REQUEST> at the top.
# Let's extract the code from part4.txt
m4 = re.search(r'<USER_REQUEST>\s*(.*?)\n\s*✅ \*\*Check pós-aplicação', text4, re.DOTALL)
if m4:
    code_part2 = m4.group(1)
    # it might have ```jsx or ``` at the end, clean it up
    code_part2 = re.sub(r'```jsx|```', '', code_part2)
else:
    # fallback: just take everything between USER_REQUEST and the check or ADDITIONAL_METADATA
    m4_fallback = re.search(r'<USER_REQUEST>\s*(.*?)(✅ \*\*Check pós-aplicação|<ADDITIONAL_METADATA>)', text4, re.DOTALL)
    if m4_fallback:
        code_part2 = m4_fallback.group(1)
        code_part2 = re.sub(r'```jsx|```', '', code_part2)
    else:
        code_part2 = text4

# Overlap string
overlap = r"                  {new Date(snapshot.generatedAt).toLocaleDateString('pt-BR')}\n                </span>"

# Split part1 before the overlap
# Note: we need to find the exact line.
idx = code_part1.rfind("toLocaleDateString('pt-BR')}")
if idx != -1:
    # Go back to start of line
    idx_start_of_line = code_part1.rfind('\n', 0, idx)
    code_part1_trimmed = code_part1[:idx_start_of_line]

    # Now find the overlap in part 2
    idx2 = code_part2.find("toLocaleDateString('pt-BR')}")
    if idx2 != -1:
        idx2_start_of_line = code_part2.rfind('\n', 0, idx2)
        code_part2_trimmed = code_part2[idx2_start_of_line:]
        
        final_code = code_part1_trimmed + code_part2_trimmed
        
        with open('d:/Downloads/ultra-patched/src/components/coach/CoachControlCenter.jsx', 'w', encoding='utf-8') as f:
            f.write(final_code)
        print("Stitched CoachControlCenter.jsx successfully.")
    else:
        print("Could not find overlap in part 4.")
else:
    print("Could not find overlap in part 3.")
