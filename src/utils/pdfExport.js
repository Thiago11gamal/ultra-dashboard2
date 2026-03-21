import html2pdf from 'html2pdf.js';

export const exportComponentAsPDF = async (elementId, filename = 'documento.pdf', orientation = 'landscape') => {
    // Remove heavy effects
    document.body.classList.add('pdf-render-mode');

    // Allow React state to update UI
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
        // Fallback para impressão nativa do navegador (mais estável, à prova de crashes em DOMs pesados)
        window.print();
        return true;
    } catch (e) {
        console.error('Erro ao gerar PDF:', e);
        return false;
    } finally {
        setTimeout(() => {
            document.body.classList.remove('pdf-render-mode');
        }, 1000);
    }
};
