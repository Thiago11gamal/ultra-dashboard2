const fs = require('fs');
const file = 'c:/Users/antun.BOOK-201QO8FPFE/Downloads/ultra-patched/ultra-patched/src/components/AICoachView.jsx';
const content = fs.readFileSync(file, 'utf8');

// The file contents have lines 395 to 500 roughly containing:
// 1. {suggestedFocus ? ( ... )}
// 2. {calibrationSummary.length > 0 && ( ... )}

// Find the boundaries
const startFocus = content.indexOf('                {suggestedFocus ? (');
const endCalibSearch = '                </div>\r\n            )}\r\n'; // This is the end of calibrationSummary block
const endCalib = content.indexOf(endCalibSearch, startFocus);

if (startFocus === -1 || endCalib === -1) {
    console.log("Could not find boundaries", { startFocus, endCalib });
    process.exit(1);
}

const endCalibComplete = endCalib + endCalibSearch.length;
const blocksToMove = content.substring(startFocus, endCalibComplete);

// Remove the blocks from original position
let finalContent = content.substring(0, startFocus) + content.substring(endCalibComplete);

// Find the target: inside viewMode === 'planner'
const targetStr = '                        {systemAlerts.length > 0 && (';
const targetIndex = finalContent.indexOf(targetStr);

if (targetIndex === -1) {
    console.log("Could not find target index");
    process.exit(1);
}

// Prepare the moved block with slightly adjusted indentation
const indentedBlocks = blocksToMove.split('\n').map(line => {
    if (line.trim().length === 0) return line;
    return '    ' + line; // add 4 spaces for better indentation inside Motion.div
}).join('\n');

finalContent = finalContent.substring(0, targetIndex) + indentedBlocks + '\n' + finalContent.substring(targetIndex);

fs.writeFileSync(file, finalContent);
console.log('Successfully moved blocks');
