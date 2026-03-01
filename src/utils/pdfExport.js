import html2pdf from 'html2pdf.js';

export const generatePDFReport = () => {
    const element = document.body; // Snapshot entire body or a specific ID
    const today = new Date();
    const dateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const opt = {
        margin: 0.5,
        filename: `relatorio-estudos-${dateStr}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    // Use a specific container if possible to avoid UI clutter
    // For now, body is safest to capture everything seen.
    // Ideally, we clones the node and removes buttons, but let's start simple.

    html2pdf().set(opt).from(element).save();
};
