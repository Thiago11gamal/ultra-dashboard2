const fs = require('fs');
const path = 'c:/Users/antun.BOOK-201QO8FPFE/Downloads/ultra-patched/ultra-patched/src/components/AICoachView.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use precise indexes based on static strings that are known to exist and be unique
const str1Start = '                {suggestedFocus ? (';
const str1End = '                )}';
const idx1Start = content.indexOf(str1Start);
const idx1End = content.indexOf(str1End, idx1Start) + str1End.length;

const str2Start = '            {calibrationSummary.length > 0 && (';
const str2End = '            )}';
const idx2Start = content.indexOf(str2Start);
const idx2End = content.indexOf(str2End, idx2Start) + str2End.length;

if (idx1Start === -1 || idx1End === -1 || idx2Start === -1 || idx2End === -1) {
    console.error("Could not find blocks");
    process.exit(1);
}

const block1 = content.slice(idx1Start, idx1End);
const block2 = content.slice(idx2Start, idx2End);

// Remove block2 first since it's further down, won't mess up block1 indexes
content = content.slice(0, idx2Start) + content.slice(idx2End);

// The div closing the flex gap-6 is right after block1. We must NOT remove it.
// We remove only block1
content = content.slice(0, idx1Start) + content.slice(idx1End);

// Now find the target which is right before systemAlerts
const targetStr = '                        {systemAlerts.length > 0 && (';
const targetIdx = content.indexOf(targetStr);
if (targetIdx === -1) {
    console.error("Could not find target");
    process.exit(1);
}

// Indent both blocks by 4 spaces
const indent = (block) => block.split('\\n').map(line => {
    // preserve empty lines
    if (line.trim().length === 0) return line;
    // Handle \r if present
    if (line.endsWith('\\r')) return '    ' + line.slice(0, -1) + '\\r';
    return '    ' + line;
}).join('\\n');

const indentedBlock1 = indent(block1);
const indentedBlock2 = indent(block2);

const newLines = [
    '                        <div className="space-y-6 mb-8">',
    indentedBlock1,
    '',
    indentedBlock2,
    '                        </div>',
    ''
];

const injection = newLines.join('\\n');

content = content.slice(0, targetIdx) + injection + content.slice(targetIdx);

fs.writeFileSync(path, content);
console.log("Success");
