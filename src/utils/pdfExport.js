import html2pdf from 'html2pdf.js';

export const exportComponentAsPDF = async (elementId, filename = 'documento.pdf', orientation = 'landscape') => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Elemento com ID ${elementId} não encontrado.`);
        return false;
    }

    // Remove heavy effects that crash the canvas parser
    document.body.classList.add('pdf-render-mode');

    // Identificar o tema atual para o fundo do PDF
    const isDark = document.documentElement.classList.contains('dark') || document.body.style.backgroundColor !== '';
    const bgColor = isDark ? '#0f172a' : '#ffffff';

    const opt = {
        margin:       [10, 10, 10, 10],
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.85 },
        html2canvas:  { 
            scale: 1, // Reduzido drasticamente para 1.0 (evita congelar o navegador de forma agressiva) 
            useCORS: true, 
            logging: false,
            backgroundColor: bgColor,
            ignoreElements: (node) => node.classList && node.classList.contains('no-print')
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: orientation }
    };

    // Allow React state to update UI (spinner)
    await new Promise(resolve => setTimeout(resolve, 250));

    try {
        await html2pdf().set(opt).from(element).save();
        return true;
    } catch (e) {
        console.error('Erro ao gerar PDF:', e);
        return false;
    } finally {
        document.body.classList.remove('pdf-render-mode');
    }
};
