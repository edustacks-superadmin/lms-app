'use client';

import React, { useState } from 'react';
import { X, FileText, CheckSquare, List } from 'lucide-react';

const PrintPreviewModal = ({ isOpen, onClose, exam, onPreview }) => {
    const [attributes, setAttributes] = useState({
        question_text: true,
        options: true,
        answer: false,
        explanation: false,
        subject: false,
        difficulty: false
    });

    if (!isOpen) return null;

    const handleToggle = (key) => {
        setAttributes(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleQuickLink = (type) => {
        if (type === 'paper') {
            setAttributes({
                question_text: true,
                options: true,
                answer: false,
                explanation: false,
                subject: false,
                difficulty: false
            });
        } else if (type === 'ans_sheet') {
            setAttributes({
                question_text: false,
                options: false,
                answer: true,
                explanation: true,
                subject: true,
                difficulty: false
            });
        }
    };

    const handlePreviewClick = () => {
        const params = new URLSearchParams();
        if (attributes.question_text) params.set('show_question_text', '1');
        if (attributes.options) params.set('show_options', '1');
        if (attributes.answer) params.set('show_answer', '1');
        if (attributes.explanation) params.set('show_explanation', '1');
        if (attributes.subject) params.set('show_subject', '1');
        if (attributes.difficulty) params.set('show_difficulty', '1');

        onPreview(params.toString());
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] backdrop-blur-[2px]">
            <div className="bg-white rounded-lg w-full max-w-[600px] shadow-xl overflow-hidden">
                {/* Header */}
                <div className="py-4 px-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="m-0 text-lg font-medium text-gray-800">
                        Preview preference for {exam?.title}
                    </h2>
                    <button onClick={onClose} className="border-none bg-transparent cursor-pointer text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-6 px-5">
                    <p className="mb-5 text-sm text-gray-600">
                        Select the attributes to be shown in the preview
                    </p>

                    <div className="flex flex-wrap gap-5 mb-8">
                        {Object.entries(attributes).map(([key, value]) => (
                            <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={() => handleToggle(key)}
                                    className="w-4 h-4"
                                />
                                {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                            </label>
                        ))}
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                        <div className="inline-block bg-gray-500 text-white py-0.5 px-2 rounded text-xs mb-3">
                            Quick Links
                        </div>
                        <div className="flex gap-5 text-sm">
                            <button
                                onClick={() => handleQuickLink('paper')}
                                className="border-none bg-transparent text-blue-500 cursor-pointer flex items-center gap-1 p-0 hover:underline"
                            >
                                <FileText size={16} /> Question Paper
                            </button>
                            <button
                                onClick={() => handleQuickLink('ans_sheet')}
                                className="border-none bg-transparent text-blue-500 cursor-pointer flex items-center gap-1 p-0 hover:underline"
                            >
                                <CheckSquare size={16} /> Answer Sheet
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="py-4 px-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={handlePreviewClick}
                        className="py-2 px-6 bg-teal-500 text-white border-none rounded font-medium cursor-pointer hover:bg-teal-600"
                    >
                        Preview
                    </button>
                    <button
                        onClick={onClose}
                        className="py-2 px-6 bg-white text-gray-700 border border-gray-300 rounded font-medium cursor-pointer hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintPreviewModal;
