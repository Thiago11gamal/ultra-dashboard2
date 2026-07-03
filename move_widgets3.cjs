const fs = require('fs');
const path = 'c:/Users/antun.BOOK-201QO8FPFE/Downloads/ultra-patched/ultra-patched/src/components/AICoachView.jsx';

const content = fs.readFileSync(path, 'utf8');

const target1Start = '                {suggestedFocus ? (';
const target1End = '                )}';

const target2Start = '            {calibrationSummary.length > 0 && (';
const target2End = '            )}';

const target3 = '                        {systemAlerts.length > 0 && (';

const idx1 = content.indexOf(target1Start);
const end1 = content.indexOf(target1End, idx1) + target1End.length;

const idx2 = content.indexOf(target2Start);
const end2 = content.indexOf(target2End, idx2) + target2End.length;

const idx3 = content.indexOf(target3);

if (idx1 === -1 || end1 === -1 || idx2 === -1 || end2 === -1 || idx3 === -1) {
    console.log("Could not find boundaries", {idx1, end1, idx2, end2, idx3});
    process.exit(1);
}

const block1 = content.substring(idx1, end1);
const block2 = content.substring(idx2, end2);

let newContent = content.substring(0, idx1) + content.substring(end1, idx2) + content.substring(end2);

// Find idx3 in newContent
const newIdx3 = newContent.indexOf(target3);

const indentedBlock1 = block1.split('\\n').map(l => {
    if(l.trim().length === 0) return l;
    if(l.endsWith('\\r')) return '    ' + l.substring(0, l.length-1) + '\\r';
    return '    ' + l;
}).join('\\n');

const indentedBlock2 = block2.split('\\n').map(l => {
    if(l.trim().length === 0) return l;
    if(l.endsWith('\\r')) return '    ' + l.substring(0, l.length-1) + '\\r';
    return '    ' + l;
}).join('\\n');

const replacement = \`                        <div className="space-y-6 mb-8">
\${indentedBlock1}

\${indentedBlock2}
                        </div>
\`;

newContent = newContent.substring(0, newIdx3) + replacement + newContent.substring(newIdx3);

fs.writeFileSync(path, newContent);
console.log("Success");
