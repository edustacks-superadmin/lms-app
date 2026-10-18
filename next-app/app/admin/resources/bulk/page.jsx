'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInstitute } from '../../../../context/InstituteContext';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, ArrowLeft, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseResourceFile, bulkUploadResources, validateResources, downloadResourceTemplate } from '../../../../utils/resourceUploader';

const BulkUploadResources = () => {
    const router = useRouter();
    const { institute } = useInstitute();

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

        if (!institute?.id) {
            alert('Institute not found. Please try again.');
            return;
        }

        setUploading(true);
        setProgress({ current: 0, total: 0, currentItem: '' });
        setResults(null);
        setValidationErrors(null);

        try {
            // 1. Parse
            const { resources, totalRows } = await parseResourceFile(file);

            if (resources.length === 0) {
                throw new Error('No valid resource data found in file');
            }

            // 2. Validate
            const errors = validateResources(resources);
            if (errors.length > 0) {
                setValidationErrors(errors);
                setUploading(false);
                return;
            }

            // 3. Upload
            const uploadResults = await bulkUploadResources(resources, institute.id, (progressData) => {
                setProgress(progressData);
            });

            setResults({
                ...uploadResults,
                totalRows
            });
        } catch (error) {
            alert('Error uploading resources: ' + error.message);
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    const handleDownloadTemplate = () => {
        downloadResourceTemplate();
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => router.push('/admin/resources')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Bulk Upload Syllabus
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Upload multiple examinations and their associated posts at once.
                        </p>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                        <Download size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-blue-800 mb-1">
                            Download Template
                        </h3>
                        <p className="text-sm text-slate-600 mb-3">
                            Use our pre-formatted Excel template to ensure your data is correctly structured. Multiple rows with the same <b>Exam Title</b> and <b>File URL</b> will be automatically grouped into a single syllabus entry with multiple posts.
                        </p>
                        <button
                            onClick={handleDownloadTemplate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Download size={16} />
                            Download Syllabus Template
                        </button>
                    </div>
                </div>
            </div>

            {/* File Upload Section */}
            {!results && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="max-w-xl mx-auto">
                        <div className={`
                            border-2 border-dashed rounded-2xl p-10 text-center transition-all
                            ${file
                                ? 'border-blue-300 bg-blue-50/30'
                                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                            }
                        `}>
                            <div className="w-16 h-16 bg-blue-100/50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet size={32} />
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                {file ? 'File Selected' : 'Select Upload File'}
                            </h3>

                            <p className="text-sm text-slate-500 mb-8">
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
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md cursor-pointer active:scale-95"
                                >
                                    <Upload size={18} />
                                    Choose File
                                </label>
                            ) : (
                                <div className="flex flex-col sm:flex-row justify-center gap-4">
                                    <label
                                        htmlFor="file-input"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
                                    >
                                        Change File
                                    </label>
                                    <button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="inline-flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={18} />
                                                Start Bulk Upload
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-700 mb-2">
                        <span>Uploading Item {progress.current} of {progress.total}</span>
                        <span className="text-blue-600 font-mono">{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                            className="bg-blue-600 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    {progress.currentItem && (
                        <p className="text-xs text-slate-500 font-medium truncate">
                            Currently: <span className="text-slate-800">{progress.currentItem}</span>
                        </p>
                    )}
                </div>
            )}

            {/* Validation Errors */}
            {validationErrors && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
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
                            <li key={index} className="flex items-start gap-3 text-sm text-red-700 bg-white/50 p-3 rounded-xl border border-red-100">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Success Results */}
            {results && (
                <div className={`
                    rounded-2xl shadow-sm border p-8
                    ${results.failed === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}
                `}>
                    <div className="flex items-center gap-5 mb-8">
                        <div className={`
                            p-4 rounded-full shadow-sm
                            ${results.failed === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}
                        `}>
                            {results.failed === 0 ? <CheckCircle size={40} /> : <AlertCircle size={40} />}
                        </div>
                        <div>
                            <h3 className={`text-2xl font-bold ${results.failed === 0 ? 'text-emerald-900' : 'text-amber-900'}`}>
                                Bulk Upload Complete
                            </h3>
                            <p className={`text-sm font-medium ${results.failed === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                Processed {results.totalRows} rows from Excel and consolidated them into {results.success + results.failed} unique examination resources.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Successfully Uploaded</div>
                            <div className="text-4xl font-black text-emerald-600">{results.success}</div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Failed to Upload</div>
                            <div className="text-4xl font-black text-red-600">{results.failed}</div>
                        </div>
                    </div>

                    {results.errors && results.errors.length > 0 && (
                        <div className="mb-8 bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                            <div className="px-5 py-3 bg-red-50 border-b border-red-100 text-red-900 font-bold text-sm">
                                Error Details
                            </div>
                            <ul className="max-h-64 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                                {results.errors.map((err, index) => (
                                    <li key={index} className="text-sm text-slate-700 border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                                        <div className="font-bold text-red-600 mb-1">{err.item}</div>
                                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                                            <AlertCircle size={14} />
                                            {err.error}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => router.push('/admin/resources')}
                            className="px-8 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                            Back to Resources
                        </button>
                        <button
                            onClick={() => {
                                setFile(null);
                                setResults(null);
                                setValidationErrors(null);
                            }}
                            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"
                        >
                            Upload More Syllabus
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUploadResources;
