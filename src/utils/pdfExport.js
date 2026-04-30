import { toPng } from 'html-to-image';

export const exportComponentAsPDF = async (elementId, filename = 'documento.pdf', orientation = 'landscape') => {
    const element = document.getElementById(elementId);
    if (!element) return false;

    // html-to-image é robusto, então não precisamos distorcer o layout base para capturar.
    document.body.classList.add('pdf-render-mode');

    // Sempre usar fundo escuro para casar com o design em dark mode tailwind 
    // mesmo se a classe .dark não estiver globalmente no <html>
    const bgColor = '#020617'; // slate-950

    // Delay para o Spinner rodar a UI Update
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const dataUrl = await toPng(element, {
            quality: 1.0,
            pixelRatio: 2.0, // Alta resolução (2x Retina)
            backgroundColor: bgColor,
            fetchRequestInit: { cache: 'force-cache' }, // Acelera carregamento de fontes
            style: {
                // Previne cortes se container rolar
                overflowX: 'visible',
                overflowY: 'visible',
                transform: 'none'
            }
        });

        // Montar PDF com a imagem perfeita
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });

        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        const margin = 10;
        const printWidth = pdfWidth - (margin * 2);
        const printHeight = (imgProps.height * printWidth) / imgProps.width;

        pdf.addImage(dataUrl, 'PNG', margin, margin, printWidth, printHeight);
        pdf.save(filename);
        return true;
        
    } catch (e) {
        console.error('Erro Crítico ao gerar PDF (pdfExport via html-to-image):', e);
        alert('Falha interna ao gerar o PDF. Verifique o console (' + e.message + ')');
        return false;
    } finally {
        setTimeout(() => {
            document.body.classList.remove('pdf-render-mode');
        }, 500);
    }
};
