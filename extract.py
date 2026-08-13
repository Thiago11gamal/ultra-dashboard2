import re

with open('d:/Downloads/ultra-patched/part3_full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Find AICoachWidget.jsx
m1 = re.search(r'## 📄 .*AICoachWidget\.jsx.*?\n```jsx\n(.*?)```', text, re.DOTALL)
if m1:
    with open('d:/Downloads/ultra-patched/src/components/AICoachWidget.jsx', 'w', encoding='utf-8') as f:
        f.write(m1.group(1))
    print("AICoachWidget.jsx successfully written.")
else:
    print("AICoachWidget.jsx not found.")

# Find CoachControlCenter.jsx
m2 = re.search(r'## 📄 .*CoachControlCenter\.jsx.*?\n```jsx\n(.*)', text, re.DOTALL)
if m2:
    with open('d:/Downloads/ultra-patched/src/components/coach/CoachControlCenter.jsx', 'w', encoding='utf-8') as f:
        f.write(m2.group(1))
    print("CoachControlCenter.jsx successfully written (possibly truncated).")
else:
    print("CoachControlCenter.jsx not found.")

