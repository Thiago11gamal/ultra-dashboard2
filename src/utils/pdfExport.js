import html2pdf from 'html2pdf.js';

export const exportComponentAsPDF = async (elementId, filename = 'documento.pdf', orientation = 'landscape') => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Elemento com ID ${elementId} não encontrado.`);
        return;
    }

    // Identificar o tema atual para o fundo do PDF
    const isDark = document.documentElement.classList.contains('dark') || document.body.style.backgroundColor !== '';
    const bgColor = isDark ? '#0f172a' : '#ffffff';

    const opt = {
        margin:       [15, 15, 15, 15],
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            backgroundColor: bgColor,
            // Ignorar elementos de UI que não são para impressão (botões, painéis flutuantes, etc)
            ignoreElements: (node) => node.classList && node.classList.contains('no-print')
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: orientation }
    };

    try {
        await html2pdf().set(opt).from(element).save();
        return true;
    } catch (e) {
        console.error('Erro ao gerar PDF:', e);
        return false;
    }
};
