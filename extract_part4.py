import json
import re
import os

with open(r'C:\Users\antun.BOOK-201QO8FPFE\.gemini\antigravity-ide\brain\cc498ef3-a03c-4d46-8784-a93be99d376d\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    lines = f.readlines()

inputs = [json.loads(line) for line in lines if json.loads(line).get('type') == 'USER_INPUT']
last_input = inputs[-1]['content']

# Find AICoachView.jsx
m_view = re.search(r'## 📄 `components/AICoachView\.jsx` — COMPLETO.*?```jsx\n(.*?)```', last_input, re.DOTALL)
if m_view:
    with open(r'd:\Downloads\ultra-patched\src\components\AICoachView.jsx', 'w', encoding='utf-8') as f:
        f.write(m_view.group(1).strip() + '\n')
    print("AICoachView.jsx written.")
else:
    print("AICoachView.jsx not found.")

# Find learningLoop.sanity.test.js
m_test = re.search(r'## 🧪 `src/utils/__tests__/learningLoop\.sanity\.test\.js` — NOVO.*?```js\n(.*?)```', last_input, re.DOTALL)
if m_test:
    os.makedirs(r'd:\Downloads\ultra-patched\src\utils\__tests__', exist_ok=True)
    with open(r'd:\Downloads\ultra-patched\src\utils\__tests__\learningLoop.sanity.test.js', 'w', encoding='utf-8') as f:
        f.write(m_test.group(1).strip() + '\n')
    print("learningLoop.sanity.test.js written.")
else:
    print("learningLoop.sanity.test.js not found.")

