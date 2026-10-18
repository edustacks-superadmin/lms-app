'use client';

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

// Testpress Courses Import Modal Component
const TestpressCoursesImportModal = ({ isOpen, onClose }) => {
    const [importing, setImporting] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleImport = async () => {
        setImporting(true);
        setError(null);
        setResults(null);

        try {
            const response = await fetch('/api/testpress/sync-courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Failed to import courses');
            }

            setResults(data);

            if (data.results.imported > 0 || data.results.updated > 0) {
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
        } catch (err) {
            console.error('Import error:', err);
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        if (!importing) {
            setResults(null);
            setError(null);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="m-0 text-lg font-semibold">Import Courses from Testpress</h3>
                    <button
                        onClick={handleClose}
                        disabled={importing}
                        className="border-none bg-transparent cursor-pointer text-xl disabled:cursor-not-allowed"
                    >
                        ×
                    </button>
                </div>

                <div className="mb-5">
                    <p className="m-0 mb-3 text-gray-500 text-sm">
                        This will fetch all courses from your Testpress account and import them.
                    </p>
                    <p className="m-0 text-gray-500 text-sm italic">
                        Source: <strong>thapovaninstitute.testpress.in</strong>
                    </p>
                </div>

                {/* Results Display */}
                {results && (
                    <div className="bg-green-50 border border-green-300 rounded-md p-4 mb-5">
                        <h4 className="m-0 mb-3 text-green-800 text-base">✅ Import Complete!</h4>
                        <div className="text-sm text-green-800">
                            <div className="mb-1.5">📊 Total courses found: <strong>{results.total}</strong></div>
                            <div className="mb-1.5">✅ Imported: <strong>{results.results.imported}</strong></div>
                            <div className="mb-1.5">🔄 Updated: <strong>{results.results.updated}</strong></div>
                            <div className="mb-1.5">⏭️ Skipped: <strong>{results.results.skipped}</strong></div>
                            {results.results.failed > 0 && (
                                <div className="text-red-600">❌ Failed: <strong>{results.results.failed}</strong></div>
                            )}
                        </div>
                        {results.results.errors && results.results.errors.length > 0 && (
                            <div className="mt-3 text-xs text-red-600 max-h-[150px] overflow-y-auto">
                                <strong>Errors:</strong>
                                {results.results.errors.map((err, i) => (
                                    <div key={i} className="mt-1">• {err}</div>
                                ))}
                            </div>
                        )}
                        <div className="mt-3 text-xs text-emerald-600 italic">
                            Page will refresh in 3 seconds...
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-300 rounded-md p-4 mb-5 text-red-600">
                        <strong>❌ Error:</strong> {error}
                    </div>
                )}

                {/* Progress */}
                {importing && (
                    <div className="bg-gray-100 rounded-md p-4 mb-5 text-center">
                        <RefreshCw size={32} className="text-violet-600 animate-spin mb-3 mx-auto" />
                        <div className="text-sm text-gray-500">Importing courses from Testpress...</div>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="btn bg-gray-200 text-gray-700 border-none rounded-md py-2 px-4 cursor-pointer disabled:cursor-not-allowed"
                        disabled={importing}
                    >
                        {results ? 'Close' : 'Cancel'}
                    </button>
                    {!results && (
                        <button
                            onClick={handleImport}
                            className="btn bg-violet-600 text-white border-none rounded-md py-2 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={importing}
                        >
                            {importing ? 'Importing...' : 'Start Import'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestpressCoursesImportModal;
