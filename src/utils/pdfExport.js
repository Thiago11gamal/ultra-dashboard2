import { toPng } from 'html-to-image';

let pdfCleanupTimeoutId = null;

function resolvePdfBgColor(element) {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return '#020617';
  const elBg = getComputedStyle(element).backgroundColor;
  if (elBg && elBg !== 'rgba(0, 0, 0, 0)' && elBg !== 'transparent') return elBg;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') return bodyBg;
  const isLight = document.documentElement.classList.contains('light') || document.documentElement.dataset.theme === 'light';
  return isLight ? '#ffffff' : '#020617';
}

function parseRgbCss(color) {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(String(color || ''));
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  if (String(color).toLowerCase() === '#ffffff') return [255, 255, 255];
  return [2, 6, 23];
}

export const exportComponentAsPDF = async (elementId, filename = 'documento.pdf', orientation = 'landscape') => {
  const element = document.getElementById(elementId);
  if (!element) return false;

  if (pdfCleanupTimeoutId) {
    clearTimeout(pdfCleanupTimeoutId);
    pdfCleanupTimeoutId = null;
  }

  document.body.classList.add('pdf-render-mode');
  const bgColor = resolvePdfBgColor(element);
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const captureWidth = Math.max(element.scrollWidth || 0, element.clientWidth || 0);
    const captureHeight = Math.max(element.scrollHeight || 0, element.clientHeight || 0);
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2.0,
      backgroundColor: bgColor,
      ...(captureWidth > 0 ? { width: captureWidth } : {}),
      ...(captureHeight > 0 ? { height: captureHeight } : {}),
      fetchRequestInit: { cache: 'no-cache' },
      style: {
        overflow: 'visible',
        overflowX: 'visible',
        overflowY: 'visible',
        transform: 'none',
        ...(captureWidth > 0 ? { width: `${captureWidth}px` } : {}),
      }
    });
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const imgProps = pdf.getImageProperties(dataUrl);
    if (!imgProps || !(imgProps.width > 0) || !(imgProps.height > 0)) {
      return false;
    }

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printWidth = pdfWidth - (margin * 2);
    const pageHeight = pdfHeight - (margin * 2);
    const printHeight = (imgProps.height * printWidth) / imgProps.width;
    const PAGE_EPSILON_MM = 0.5;
    const [r, g, b] = parseRgbCss(bgColor);

    let heightLeft = printHeight;
    let position = margin;
    let pageIndex = 0;

    while (heightLeft > PAGE_EPSILON_MM || pageIndex === 0) {
      if (pageIndex > 0) pdf.addPage();
      position = margin - (pageIndex * pageHeight);
      pdf.addImage(dataUrl, 'PNG', margin, position, printWidth, printHeight);

      // Máscaras nas margens superior e inferior evitam vazamento de conteúdo fatiado fora da área útil
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, pdfWidth, margin, 'F');
      pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');

      heightLeft -= pageHeight;
      pageIndex += 1;
    }

    pdf.save(filename);
    return true;
  } catch (e) {
    console.error('Erro Crítico ao gerar PDF:', e);
    return false;
  } finally {
    pdfCleanupTimeoutId = setTimeout(() => {
      document.body.classList.remove('pdf-render-mode');
      pdfCleanupTimeoutId = null;
    }, 500);
  }
};
