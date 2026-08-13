const fs = require('fs');
const content = fs.readFileSync('d:/Downloads/ultra-patched/part3_full.txt', 'utf8');
const widgetStart = content.indexOf('AICoachWidget.jsx');
const widgetEnd = content.indexOf('CoachControlCenter.jsx');

if (widgetStart !== -1 && widgetEnd !== -1) {
    const widgetSection = content.substring(widgetStart, widgetEnd);
    const codeStart = widgetSection.indexOf('```jsx') + 6;
    const codeEnd = widgetSection.lastIndexOf('```');
    const code = widgetSection.substring(codeStart, codeEnd).trim();
    fs.writeFileSync('d:/Downloads/ultra-patched/src/components/AICoachWidget.jsx', code, 'utf8');
    console.log('AICoachWidget.jsx extracted and saved.');
} else {
    console.log('Could not find markers', widgetStart, widgetEnd);
}
