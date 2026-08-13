const fs = require('fs');

let part3 = fs.readFileSync('d:/Downloads/ultra-patched/part3_full.txt', 'utf8');
let part4 = fs.readFileSync('d:/Downloads/ultra-patched/part4.txt', 'utf8');

let m2Start = part3.indexOf('`components/coach/CoachControlCenter.jsx`');
let code1Start = part3.indexOf('```jsx', m2Start) + 6;
let code1Text = part3.substring(code1Start);

let overlapStr = "toLocaleDateString('pt-BR')}";
let overlapIdx1 = code1Text.lastIndexOf(overlapStr);
if (overlapIdx1 !== -1) {
    let cutoff = code1Text.lastIndexOf('\n', overlapIdx1);
    code1Text = code1Text.substring(0, cutoff);
}

let m4Start = part4.indexOf('<USER_REQUEST>');
let m4End = part4.indexOf('✅ **Check pós-aplicação');
if(m4End === -1) m4End = part4.indexOf('<ADDITIONAL_METADATA>');

let code2Text = part4.substring(m4Start + 14, m4End);
code2Text = code2Text.replace(/```jsx|```/g, '');

let overlapIdx2 = code2Text.indexOf(overlapStr);
if (overlapIdx2 !== -1) {
    let cutoff2 = code2Text.lastIndexOf('\n', overlapIdx2);
    code2Text = code2Text.substring(cutoff2);
}

let finalCode = code1Text + code2Text;
fs.writeFileSync('d:/Downloads/ultra-patched/src/components/coach/CoachControlCenter.jsx', finalCode, 'utf8');
console.log('Stitched beautifully in JS');
