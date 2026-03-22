import html2pdfModule from 'html2pdf.js';

export const exportComponentAsPDF = async (elementId, filename = 'documento.pdf', orientation = 'landscape') => {
    const element = document.getElementById(elementId);
    if (!element) return false;

    // Resolve ESM import wrapper if Vite mangled it
    const pdfLib = (html2pdfModule && html2pdfModule.default) ? html2pdfModule.default : html2pdfModule;

    document.body.classList.add('pdf-render-mode');

    const isDark = document.documentElement.classList.contains('dark') || document.body.style.backgroundColor !== '';
    const bgColor = isDark ? '#0f172a' : '#ffffff';

    const opt = {
        margin:       [10, 10, 10, 10],
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.95 },
        html2canvas:  { 
            scale: 1.2, 
            useCORS: true, 
            logging: true,
            backgroundColor: bgColor,
            windowWidth: document.body.scrollWidth,
            windowHeight: document.body.scrollHeight
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: orientation }
    };

    // Delay para garantir que o React engatilhou a classe CSS
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        await pdfLib().set(opt).from(element).save();
        return true;
    } catch (e) {
        console.error('Erro Crítico ao gerar PDF (pdfExport):', e);
        alert('Falha interna ao gerar o PDF. Verifique o console (' + e.message + ')');
        return false;
    } finally {
        setTimeout(() => {
            document.body.classList.remove('pdf-render-mode');
        }, 500);
    }
};
