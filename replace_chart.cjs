const fs = require('fs');
const file = 'd:/Downloads/ultra-patched/src/components/EvolutionChart.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldStr = `function renderInsightText(text, textColorClass) {
    if (typeof text !== 'string') return text;
    const parts = text.split(/(\\**.*?\\**|!!.*?!!)/g).filter(Boolean);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className={\`\${textColorClass} font-black drop-shadow-[0_0_8px_currentColor]\`}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('!!') && part.endsWith('!!')) {
            return <span key={idx} className="text-rose-500 font-bold drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">{part.slice(2, -2)}</span>;
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
}`;

const newStr = `function renderInsightText(text, textColorClass) {
    if (typeof text !== 'string') return text;
    const parts = text.split(/(\\**.*?\\**|!!.*?!!|\\+\\+.*?\\+\\+)/g).filter(Boolean);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className={\`\${textColorClass} font-black drop-shadow-[0_0_8px_currentColor]\`}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('!!') && part.endsWith('!!')) {
            return <span key={idx} className="text-rose-500 font-bold drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">{part.slice(2, -2)}</span>;
        }
        if (part.startsWith('++') && part.endsWith('++')) {
            return <span key={idx} className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{part.slice(2, -2)}</span>;
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
}`;

content = content.replace(oldStr, newStr);

fs.writeFileSync(file, content);
console.log('Replaced successfully in EvolutionChart.jsx');
