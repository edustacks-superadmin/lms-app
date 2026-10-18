import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Utility to strip HTML tags for PDF text
const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

export const exportExamToPDF = async (exam, questions) => {
    const doc = jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.text(exam.title, pageWidth / 2, 20, { align: 'center' });

    // metadata
    doc.setFontSize(12);
    doc.text(`Duration: ${exam.duration_minutes} mins`, 14, 35);
    doc.text(`Total Marks: ${exam.total_marks || 0}`, 14, 42);
    doc.text(`Total Questions: ${questions.length}`, 14, 49);

    if (exam.description) {
        doc.setFontSize(10);
        const splitDescription = doc.splitTextToSize(stripHtml(exam.description), pageWidth - 28);
        doc.text(splitDescription, 14, 58);
    }

    doc.line(14, 75, pageWidth - 14, 75);

    // Questions
    let yPos = 85;

    questions.forEach((qItem, index) => {
        const q = qItem.questions;
        if (!q) return;

        // Check for page break
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const qText = `${index + 1}. ${stripHtml(q.question_text)}`;
        const splitQText = doc.splitTextToSize(qText, pageWidth - 28);
        doc.text(splitQText, 14, yPos);
        yPos += (splitQText.length * 7);

        // Marks
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text(`(Marks: ${qItem.marks || 0})`, pageWidth - 40, yPos - 5);

        // Options
        if (q.options && q.options.length > 0) {
            doc.setFont('helvetica', 'normal');
            q.options.sort((a, b) => a.option_label.localeCompare(b.option_label)).forEach((opt) => {
                const optText = `${opt.option_label}) ${stripHtml(opt.option_text)}`;
                const splitOpt = doc.splitTextToSize(optText, pageWidth - 35);
                doc.text(splitOpt, 20, yPos);
                yPos += (splitOpt.length * 6);

                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
            });
        }

        yPos += 10;

        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
    });

    // Save
    const fileName = `${exam.title.replace(/\s+/g, '_')}_Questions.pdf`;
    doc.save(fileName);
};
