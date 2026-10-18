'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, ArrowLeft, FileSpreadsheet, Loader2 } from 'lucide-react';
import { downloadTemplate } from '../utils/questionTemplateGenerator';
import { processQuestionUpload } from '../utils/questionUploader';

const BulkUploadQuestions = () => {
    const params = useParams();
    const folderId = params?.folderId || params?.id;
    const router = useRouter();

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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => router.push(folderId ? `/questions/folders/${folderId}` : '/questions')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Bulk Upload Questions
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Upload multiple questions at once using Excel or CSV.
                        </p>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-4">
                    <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-blue-800 mb-1">
                            First Time Uploading?
                        </h3>
                        <p className="text-sm text-slate-600 mb-3">
                            Download our pre-formatted Excel template. It includes examples and instructions on how to format your questions, including support for mathematical equations (LaTeX).
                        </p>
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Download size={16} />
                            Download Template
                        </button>
                    </div>
                </div>
            </div>

            {/* File Upload Section */}
            {!results && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <div className="max-w-xl mx-auto">
                        <div className={`
                            border-2 border-dashed rounded-xl p-8 text-center transition-all
                            ${file
                                ? 'border-blue-300 bg-blue-50/30'
                                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                            }
                        `}>
                            <div className="w-16 h-16 bg-blue-100/50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet size={32} />
                            </div>

                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                {file ? 'File Selected' : 'Select Upload File'}
                            </h3>

                            <p className="text-sm text-slate-500 mb-6">
                                {file
                                    ? `Ready to upload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
                                    : 'Drag and drop or click to select your Excel (.xlsx, .xls) or CSV file'
                                }
                            </p>

                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-input"
                            />

                            {!file ? (
                                <label
                                    htmlFor="file-input"
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                                >
                                    <Upload size={18} />
                                    Choose File
                                </label>
                            ) : (
                                <div className="flex justify-center gap-3">
                                    <label
                                        htmlFor="file-input"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-sm"
                                    >
                                        Change File
                                    </label>
                                    <button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={18} />
                                                Start Upload
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {progress && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-2">
                        <span>Processing Question {progress.current} of {progress.total}</span>
                        <span className="text-blue-600">{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                            className="bg-blue-600 h-full transition-all duration-300 ease-out"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    {progress.currentQuestion && (
                        <p className="text-xs text-slate-500 font-mono truncate">
                            Processing: {progress.currentQuestion}
                        </p>
                    )}
                </div>
            )}

            {/* Validation Errors */}
            {validationErrors && validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <XCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-800">Validation Failed</h3>
                            <p className="text-sm text-red-600">Please fix the following {validationErrors.length} errors and try again.</p>
                        </div>
                    </div>

                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {validationErrors.map((error, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-red-700 bg-white/50 p-2 rounded border border-red-100">
                                <span className="font-bold text-red-500">•</span>
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Success Results */}
            {results && (
                <div className={`
                    rounded-xl shadow-sm border p-6
                    ${results.failed === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}
                `}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`
                            p-3 rounded-full 
                            ${results.failed === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}
                        `}>
                            {results.failed === 0 ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold ${results.failed === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                                Upload Complete
                            </h3>
                            <p className={`text-sm ${results.failed === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                Processed {results.success + results.failed} items
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/60 rounded-lg p-4 border border-emerald-100">
                            <div className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Successful</div>
                            <div className="text-2xl font-bold text-emerald-600">{results.success}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-4 border border-red-100">
                            <div className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Failed</div>
                            <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                        </div>
                    </div>

                    {results.errors && results.errors.length > 0 && (
                        <div className="mb-6 bg-white rounded-lg border border-red-200 overflow-hidden">
                            <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-800 font-bold text-sm">
                                Error Details
                            </div>
                            <ul className="max-h-48 overflow-y-auto p-4 space-y-2">
                                {results.errors.map((err, index) => (
                                    <li key={index} className="text-sm text-slate-700 border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                                        <span className="font-semibold text-red-600">Row {err.row}:</span> {err.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push(folderId ? `/questions/folders/${folderId}` : '/questions')}
                            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            View Questions
                        </button>
                        <button
                            onClick={() => {
                                setFile(null);
                                setResults(null);
                                setValidationErrors(null);
                            }}
                            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Upload Another File
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUploadQuestions;
