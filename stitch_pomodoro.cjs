const fs = require('fs');
const transcriptPath = 'C:/Users/antun.BOOK-201QO8FPFE/.gemini/antigravity-ide/brain/b2842dac-dbdb-4741-a325-e5a46ac280a5/.system_generated/logs/transcript_full.jsonl';
const logs = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse);

let chunk1 = '';
let chunk2 = '';

logs.forEach(log => {
  if (log.type === 'USER_INPUT' && log.content.includes('Substitua todo o conteúdo do arquivo src/pages/Pomodoro.jsx')) {
    chunk1 = log.content;
  }
  if (log.type === 'USER_INPUT' && log.content.includes('dyMinutes = 0;')) {
    chunk2 = log.content;
  }
});

if(chunk1 && chunk2) {
    const p1 = chunk1.substring(chunk1.indexOf('import { PageErrorBoundary }'));
    const code1 = p1.split('if (normalized === \'dashboard\' || normalize')[0] + 'if (normalized === \'dashboard\' || normalize';
    
    const code2 = chunk2.substring(chunk2.indexOf('dyMinutes = 0;'), chunk2.lastIndexOf('</USER_REQUEST>'));
    const finalCode2 = code2.replace('}     tem te achar o complemento do codigo que foi cortado', '}').trim();

    const gap = `d === 'dashboard_selector') {
            return '/';
        }
        return \`/\${normalized}\`;
    };

    const resolveSessionSource = (subjectSource) => {
        const entry = String(entrySourceRef.current || '').replace(/^\\/+/, '');
        const subject = String(subjectSource || '').replace(/^\\/+/, '');

        if (entry === 'dashboard') return 'dashboard';
        return subject || entry || 'pomodoro';
    };

    const [isLayoutLocked, setIsLayoutLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroLayoutLocked');
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.error('Failed to parse pomodoroLayoutLocked:', error);
            return true;
        }
    });

    const toggleLayoutLock = () => {
        const newState = !isLayoutLocked;
        setIsLayoutLocked(newState);
        localStorage.setItem('pomodoroLayoutLocked', JSON.stringify(newState));
    };

    const userStats = useMemo(() => {
        if (!contest || contest === EMPTY_OBJECT) {
            return {
                pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, completedCycles),
                consecutiveMinutes: 0,
                settings: null
            };
        }

        const now = new Date();
        const startOfToday = getLocalMidnight().getTime();

        let consecutiveStu`;

    const finalResult = code1 + gap + finalCode2;
    fs.writeFileSync('src/pages/Pomodoro.jsx', finalResult);
    console.log('Success! Stitched length: ', finalResult.length);
} else {
    console.log('Chunks not found.');
}
