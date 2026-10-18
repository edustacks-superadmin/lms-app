import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FileText } from 'lucide-react';

const ExamPdfViewer = () => {
    const { id } = useParams();
    const [pdfUrl, setPdfUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPdf = async () => {
            try {
                const { data, error } = await supabase
                    .from('exams')
                    .select('pdf_url')
                    .eq('id', id)
                    .single();
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
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading PDF...</div>;
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Exam PDF</h2>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <embed src={pdfUrl} type="application/pdf" width="100%" height="800px" />
            </div>
        </div>
    );
};

export default ExamPdfViewer;
