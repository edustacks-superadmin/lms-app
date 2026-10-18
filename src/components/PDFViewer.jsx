import React, { useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, X } from 'lucide-react';

// Configure PDF.js worker - matching react-pdf's bundled version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

const PDFViewer = ({ url, onClose }) => {
    const [numPages, setNumPages] = useState(null);
    const [scale, setScale] = useState(1.0);

    // Memoize options to prevent unnecessary reloads
    const options = useMemo(() => ({
        cMapUrl: `https://unpkg.com/pdfjs-dist@5.4.296/cmaps/`,
        cMapPacked: true,
    }), []);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

    return (
        <div className="pdf-viewer-overlay">
            <div className="pdf-viewer-container">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="pdf-loading">Loading PDF...</div>}
                    error={<div className="pdf-error">Failed to load PDF. Please try again.</div>}
                    options={options}
                >
                    {Array.from(new Array(numPages), (el, index) => (
                        <div key={`page_${index + 1}`} className="pdf-page-wrapper">
                            <Page
                                pageNumber={index + 1}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                loading={<div className="pdf-loading" style={{ height: '200px' }}>Loading page...</div>}
                            />
                        </div>
                    ))}
                </Document>
            </div>

            {/* Floating Controls */}
            <div className="pdf-floating-controls">
                <button onClick={zoomIn} className="pdf-float-btn" title="Zoom In">
                    <ZoomIn size={24} />
                </button>
                <button onClick={zoomOut} className="pdf-float-btn" title="Zoom Out">
                    <ZoomOut size={24} />
                </button>
                <button onClick={onClose} className="pdf-float-btn pdf-close-float" title="Close">
                    <X size={24} />
                </button>
            </div>
        </div>
    );
};

export default PDFViewer;
