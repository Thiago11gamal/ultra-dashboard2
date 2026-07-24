const fs = require('fs');
const transcriptPath = 'C:\\Users\\antun.BOOK-201QO8FPFE\\.gemini\\antigravity-ide\\brain\\b2842dac-dbdb-4741-a325-e5a46ac280a5\\.system_generated\\logs\\transcript_full.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
let part1 = '';
let part2 = '';

for (const line of lines) {
    try {
        const entry = JSON.parse(line);
        if (entry.type === 'USER_INPUT') {
            const text = entry.content || '';
            if (text.includes('import { calculateMSSD')) {
                part1 = text;
            } else if (text.includes('inefficiencyPenaltyMultiplier,')) {
                part2 = text;
            }
        }
    } catch(e) {}
}

function extractContent(str) {
    let result = str;
    const startTag = '<USER_REQUEST>';
    const endTag = '</USER_REQUEST>';
    
    if (result.startsWith(startTag)) {
        result = result.substring(startTag.length).trim();
    }
    
    const endIdx = result.lastIndexOf(endTag);
    if (endIdx !== -1) {
        result = result.substring(0, endIdx).trim();
    }
    
    // Also remove the truncation note if present
    const truncIdx = result.indexOf('<truncated');
    if (truncIdx !== -1) {
        result = result.substring(0, truncIdx).trim();
    }
    
    return result;
}

part1 = extractContent(part1);
part2 = extractContent(part2);

// Clean up first line of part1 (implemente , já mando o restante src/utils/coachLogic.js)
part1 = part1.replace(/^implemente.*?src\/utils\/coachLogic\.js/i, '').trim();

// Find overlap point
const overlap = 'inefficiencyPenaltyMultiplier,';
const cutIndex = part1.indexOf(overlap);

if (cutIndex !== -1) {
    const finalContent = part1.substring(0, cutIndex) + part2;
    fs.writeFileSync('d:\\Downloads\\ultra-patched\\src\\utils\\coachLogic.js', finalContent, 'utf8');
    console.log('Successfully stitched and wrote to coachLogic.js');
} else {
    console.log('Overlap not found!');
}
