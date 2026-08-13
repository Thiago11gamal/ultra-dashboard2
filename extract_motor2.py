import json
import re
import os

with open(r'C:\Users\antun.BOOK-201QO8FPFE\.gemini\antigravity-ide\brain\cc498ef3-a03c-4d46-8784-a93be99d376d\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    lines = f.readlines()

inputs = [json.loads(line) for line in lines if json.loads(line).get('type') == 'USER_INPUT']
last_input = inputs[-1]['content']

js_blocks = re.findall(r'```js\n(.*?)```', last_input, re.DOTALL)
if len(js_blocks) >= 3:
    with open(r'd:\Downloads\ultra-patched\src\utils\calibration.js', 'w', encoding='utf-8') as f:
        f.write(js_blocks[0].strip() + '\n')
    print("calibration.js written.")
    
    with open(r'd:\Downloads\ultra-patched\src\utils\coachAdaptive.js', 'w', encoding='utf-8') as f:
        f.write(js_blocks[1].strip() + '\n')
    print("coachAdaptive.js written.")
    
    with open(r'd:\Downloads\ultra-patched\src\utils\autoTunerGate.js', 'w', encoding='utf-8') as f:
        f.write(js_blocks[2].strip() + '\n')
    print("autoTunerGate.js written.")
else:
    print(f"Found only {len(js_blocks)} js blocks")

