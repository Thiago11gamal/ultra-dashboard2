import json
import re
import os

with open(r'C:\Users\antun.BOOK-201QO8FPFE\.gemini\antigravity-ide\brain\cc498ef3-a03c-4d46-8784-a93be99d376d\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    lines = f.readlines()

inputs = [json.loads(line) for line in lines if json.loads(line).get('type') == 'USER_INPUT']
last_input = inputs[-1]['content']

# Find calibration.js
m_calib = re.search(r'## 📄 `utils/calibration\.js` — VERSÃO FINAL ÚNICA.*?```js\n(.*?)```', last_input, re.DOTALL)
if m_calib:
    with open(r'd:\Downloads\ultra-patched\src\utils\calibration.js', 'w', encoding='utf-8') as f:
        f.write(m_calib.group(1).strip() + '\n')
    print("calibration.js written.")

# Find coachAdaptive.js
m_coach = re.search(r'## 📄 `utils/coachAdaptive\.js` — VERSÃO FINAL ÚNICA.*?```js\n(.*?)```', last_input, re.DOTALL)
if m_coach:
    with open(r'd:\Downloads\ultra-patched\src\utils\coachAdaptive.js', 'w', encoding='utf-8') as f:
        f.write(m_coach.group(1).strip() + '\n')
    print("coachAdaptive.js written.")

# Find autoTunerGate.js
m_tuner = re.search(r'## 📄 `utils/autoTunerGate\.js` — NOVO \(LOTE 5\).*?```js\n(.*?)```', last_input, re.DOTALL)
if m_tuner:
    with open(r'd:\Downloads\ultra-patched\src\utils\autoTunerGate.js', 'w', encoding='utf-8') as f:
        f.write(m_tuner.group(1).strip() + '\n')
    print("autoTunerGate.js written.")

