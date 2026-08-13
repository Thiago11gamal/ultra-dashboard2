import re

with open('d:/Downloads/ultra-patched/part3_full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

m1 = re.search(r'`components/AICoachWidget\.jsx`.*?```jsx\n(.*?)```', text, re.DOTALL)
if m1:
    with open('d:/Downloads/ultra-patched/src/components/AICoachWidget.jsx', 'w', encoding='utf-8') as f:
        f.write(m1.group(1))
    print("AICoachWidget.jsx successfully written.")
else:
    print("AICoachWidget.jsx not found.")

m2 = re.search(r'`components/coach/CoachControlCenter\.jsx`.*?```jsx\n(.*)', text, re.DOTALL)
if m2:
    code = m2.group(1)
    # the code is truncated, it doesn't have a closing ```
    code = re.sub(r'<truncated.*?$', '', code, flags=re.DOTALL)
    with open('d:/Downloads/ultra-patched/src/components/coach/CoachControlCenter.jsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("CoachControlCenter.jsx successfully written (possibly truncated).")
else:
    print("CoachControlCenter.jsx not found.")

