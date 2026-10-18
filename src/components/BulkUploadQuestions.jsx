import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { downloadTemplate } from '../utils/questionTemplateGenerator';
import { processQuestionUpload } from '../utils/questionUploader';

const BulkUploadQuestions = () => {
    const { folderId } = useParams();
    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [results, setResults] = useState(null);
    const [validationErrors, setValidationErrors] = useState(null);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // Check file type
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                'application/vnd.ms-excel', // .xls
                'text/csv' // .csv
            ];

            if (!validTypes.includes(selectedFile.type)) {
                alert('Please select an Excel (.xlsx, .xls) or CSV (.csv) file');
                return;
            }

            setFile(selectedFile);
            setResults(null);
            setValidationErrors(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Please select a file first');
            return;
        }

        setUploading(true);
        setProgress({ current: 0, total: 0, currentQuestion: '' });
        setResults(null);
        setValidationErrors(null);

        try {
            const result = await processQuestionUpload(file, folderId, (progressData) => {
                setProgress(progressData);
            });

            if (!result.success) {
                // Validation errors
                setValidationErrors(result.validationErrors);
            } else {
                // Upload results
                setResults(result.results);
            }
        } catch (error) {
            alert('Error uploading questions: ' + error.message);
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    const handleDownloadTemplate = () => {
        downloadTemplate();
    };

    return (
        <div style={{ flex: 1, padding: '30px 40px' }}>
            {/* Header */}
            <button
                onClick={() => navigate(folderId ? `/questions/folders/${folderId}` : '/questions')}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#666',
                    marginBottom: '20px',
                    padding: '0',
                    fontSize: '14px'
                }}
            >
                <ArrowLeft size={18} />
                {folderId ? 'Back to Folder' : 'Back to Questions'}
            </button>

            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111', marginBottom: '8px' }}>
                Bulk Upload Questions
            </h2>
            <p style={{ color: '#666', marginBottom: '32px', fontSize: '14px' }}>
                Upload multiple MCQs at once using an Excel or CSV file. Supports mathematical equations using LaTeX syntax.
            </p>

            {/* Download Template */}
            <div style={{
                backgroundColor: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '32px'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <AlertCircle size={24} color="#2196f3" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1565c0', marginBottom: '8px' }}>
                            First Time Using Bulk Upload?
                        </h3>
                        <p style={{ fontSize: '14px', color: '#333', marginBottom: '12px' }}>
                            Download our pre-formatted Excel template with examples and LaTeX instructions.
                        </p>
                        <button
                            onClick={handleDownloadTemplate}
                            style={{
                                backgroundColor: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '10px 20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            <Download size={18} />
                            Download Excel Template
                        </button>
                    </div>
                </div>
            </div>

            {/* File Upload */}
            <div style={{
                border: '2px dashed #ccc',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                marginBottom: '24px'
            }}>
                <Upload size={48} color="#999" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Upload Excel or CSV File
                </h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                    Drag and drop or click to select file (.xlsx, .xls, .csv)
                </p>
                <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="file-input"
                />
                <label
                    htmlFor="file-input"
                    style={{
                        display: 'inline-block',
                        backgroundColor: '#00bfa5',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    Select File
                </label>
                {file && (
                    <div style={{ marginTop: '16px', fontSize: '14px', color: '#333' }}>
                        <CheckCircle size={16} color="#00bfa5" style={{ display: 'inline', marginRight: '8px' }} />
                        Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                )}
            </div>

            {/* Upload Button */}
            {file && !results && (
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        style={{
                            backgroundColor: uploading ? '#ccc' : '#00bfa5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '14px 32px',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                    >
                        {uploading ? 'Uploading...' : 'Upload Questions'}
                    </button>
                </div>
            )}

            {/* Progress */}
            {progress && (
                <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '24px'
                }}>
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                            Uploading question {progress.current} of {progress.total}
                        </div>
                        <div style={{
                            backgroundColor: '#f0f0f0',
                            borderRadius: '4px',
                            height: '8px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                backgroundColor: '#00bfa5',
                                height: '100%',
                                width: `${(progress.current / progress.total) * 100}%`,
                                transition: 'width 0.3s'
                            }} />
                        </div>
                    </div>
                    {progress.currentQuestion && (
                        <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>
                            {progress.currentQuestion.substring(0, 100)}...
                        </div>
                    )}
                </div>
            )}

            {/* Validation Errors */}
            {validationErrors && validationErrors.length > 0 && (
                <div style={{
                    backgroundColor: '#ffebee',
                    border: '1px solid #ef5350',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '24px'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c62828', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <XCircle size={20} />
                        Validation Errors ({validationErrors.length})
                    </h3>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                        Please fix the following errors in your Excel file and try again:
                    </p>
                    <ul style={{ fontSize: '13px', color: '#333', margin: '0', paddingLeft: '20px' }}>
                        {validationErrors.slice(0, 10).map((error, index) => (
                            <li key={index} style={{ marginBottom: '4px' }}>{error}</li>
                        ))}
                        {validationErrors.length > 10 && (
                            <li style={{ color: '#888', fontStyle: 'italic' }}>
                                ...and {validationErrors.length - 10} more errors
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {/* Results */}
            {results && (
                <div style={{
                    backgroundColor: results.failed === 0 ? '#e8f5e9' : '#fff3e0',
                    border: `1px solid ${results.failed === 0 ? '#66bb6a' : '#ffa726'}`,
                    borderRadius: '8px',
                    padding: '24px'
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: results.failed === 0 ? '#2e7d32' : '#ef6c00',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}                    >
                        {results.failed === 0 ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                        Upload Complete
                    </h3>
                    <div style={{ fontSize: '16px', marginBottom: '16px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            ✅ <strong>{results.success}</strong> questions uploaded successfully
                        </div>
                        {results.failed > 0 && (
                            <div style={{ marginBottom: '8px' }}>
                                ❌ <strong>{results.failed}</strong> questions failed
                            </div>
                        )}
                    </div>

                    {results.errors && results.errors.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                Failed Questions:
                            </h4>
                            <ul style={{ fontSize: '13px', margin: '0', paddingLeft: '20px' }}>
                                {results.errors.slice(0, 5).map((err, index) => (
                                    <li key={index} style={{ marginBottom: '4px' }}>
                                        Row {err.row}: {err.error}
                                    </li>
                                ))}
                                {results.errors.length > 5 && (
                                    <li style={{ color: '#888', fontStyle: 'italic' }}>
                                        ...and {results.errors.length - 5} more
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => navigate(folderId ? `/questions/folders/${folderId}` : '/questions')}
                            style={{
                                backgroundColor: '#00bfa5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '10px 20px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            View Questions
                        </button>
                        <button
                            onClick={() => {
                                setFile(null);
                                setResults(null);
                                setValidationErrors(null);
                            }}
                            style={{
                                backgroundColor: '#f5f5f5',
                                color: '#333',
                                border: '1px solid #ccc',
                                borderRadius: '6px',
                                padding: '10px 20px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            Upload More
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUploadQuestions;
