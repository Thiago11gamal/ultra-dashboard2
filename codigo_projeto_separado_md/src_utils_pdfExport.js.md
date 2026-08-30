# src\utils\pdfExport.js

```js
import { toPng } from 'html-to-image';

export const exportComponentAsPDF = async (elementId, filename = 'documento.pdf', orientation = 'landscape') => {
  const element = document.getElementById(elementId);
  if (!element) return false;

  document.body.classList.add('pdf-render-mode');
  const bgColor = '#020617';
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2.0,
      backgroundColor: bgColor,
      fetchRequestInit: { cache: 'no-cache' }, // ✅ FIX: força CSS/fontes atualizadas
      style: {
        overflowX: 'visible',
        overflowY: 'visible',
        transform: 'none'
      }
    });
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const printWidth = pdfWidth - (margin * 2);
    const printHeight = (imgProps.height * printWidth) / imgProps.width;
    pdf.addImage(dataUrl, 'PNG', margin, margin, printWidth, printHeight);
    pdf.save(filename);
    return true;
  } catch (e) {
    console.error('Erro Crítico ao gerar PDF:', e);
    return false;
  } finally {
    setTimeout(() => {
      document.body.classList.remove('pdf-render-mode');
    }, 500);
  }
};


```
