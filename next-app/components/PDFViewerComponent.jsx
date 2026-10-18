'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({ url, onClose }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    if (!url) return null;

    return (
        <div className="fixed inset-0 bg-black/85 z-[10000] flex flex-col items-center justify-center">
            <div className="absolute top-5 right-5 z-[10001]">
                <button onClick={onClose} className="text-white bg-transparent border-none cursor-pointer p-2.5 hover:opacity-80">
                    <X size={32} />
                </button>
            </div>

            <div className="flex-1 overflow-auto w-full flex justify-center p-5" onClick={(e) => e.stopPropagation()}>
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="text-white text-lg">Loading PDF...</div>}
                    onLoadError={(error) => console.error('PDF Load Error:', error)}
                    error={(err) => (
                        <div className="text-white text-center">
                            Failed to load PDF.
                            {err?.message && <><br /><span className="text-xs opacity-80">{err.message}</span></>}
                        </div>
                    )}
                >
                    <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} scale={1.2} />
                </Document>
            </div>

            {numPages && (
                <div className="flex gap-5 p-5 text-white items-center bg-black/50 rounded-full mb-5">
                    <button
                        disabled={pageNumber <= 1}
                        onClick={() => setPageNumber(p => p - 1)}
                        className={`text-white bg-transparent border border-white px-4 py-2 rounded cursor-pointer transition-opacity ${pageNumber <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                    >
                        Previous
                    </button>
                    <span className="text-base font-bold">Page {pageNumber} of {numPages}</span>
                    <button
                        disabled={pageNumber >= numPages}
                        onClick={() => setPageNumber(p => p + 1)}
                        className={`text-white bg-transparent border border-white px-4 py-2 rounded cursor-pointer transition-opacity ${pageNumber >= numPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default PDFViewer;
