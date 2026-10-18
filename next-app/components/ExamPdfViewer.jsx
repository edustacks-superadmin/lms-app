'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { FileText, ArrowLeft, Download, ZoomIn, ZoomOut } from 'lucide-react';

const ExamPdfViewer = () => {
    const { id } = useParams();
    const router = useRouter();
    const [pdfUrl, setPdfUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPdf = async () => {
            try {
                const { data, error } = await supabase
                    .from('exams')
                    .select('pdf_url')
                    .eq('id', id);
                if (error) throw error;
                if (data && data.pdf_url) {
                    setPdfUrl(data.pdf_url);
                } else {
                    setError('PDF not available for this exam.');
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPdf();
    }, [id]);

    if (loading) {
        return <div className="p-10 text-center">Loading PDF...</div>;
    }

    if (error) {
        return (
            <div className="p-10 text-center text-red-500">
                {error}
            </div>
        );
    }

    return (
        <div className="p-5">
            <h2 className="text-2xl font-bold mb-4">Exam PDF</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <embed src={pdfUrl} type="application/pdf" width="100%" height="800px" />
            </div>
        </div>
    );
};

export default ExamPdfViewer;
