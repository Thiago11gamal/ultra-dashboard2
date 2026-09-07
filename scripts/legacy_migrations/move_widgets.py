import sys
import os

path = 'c:/Users/antun.BOOK-201QO8FPFE/Downloads/ultra-patched/ultra-patched/src/components/AICoachView.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target1Start = '                {suggestedFocus ? ('
target1End = '                )}'
idx1 = content.find(target1Start)
end1 = content.find(target1End, idx1) + len(target1End)

target2Start = '            {calibrationSummary.length > 0 && ('
target2End = '            )}'
idx2 = content.find(target2Start)
end2 = content.find(target2End, idx2) + len(target2End)

target3 = '                        {systemAlerts.length > 0 && ('
idx3 = content.find(target3)

if idx1 == -1 or end1 == -1 or idx2 == -1 or end2 == -1 or idx3 == -1:
    print("Could not find boundaries")
    sys.exit(1)

block1 = content[idx1:end1]
block2 = content[idx2:end2]

# Remove block2 first since it's later in the file
content = content[:idx2] + content[end2:]

# Remove block1
content = content[:idx1] + content[end1:]

# Recalculate idx3
idx3 = content.find(target3)

def indent_block(block):
    lines = block.split('\n')
    indented = []
    for line in lines:
        if line.strip():
            indented.append('    ' + line)
        else:
            indented.append(line)
    return '\n'.join(indented)

indentedBlock1 = indent_block(block1)
indentedBlock2 = indent_block(block2)

replacement = '                        <div className="space-y-6 mb-8">\n' + \
              indentedBlock1 + '\n\n' + \
              indentedBlock2 + '\n' + \
              '                        </div>\n\n' + \
              '                        {systemAlerts.length > 0 && ('

content = content[:idx3] + replacement + content[idx3 + len(target3):]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Success")
