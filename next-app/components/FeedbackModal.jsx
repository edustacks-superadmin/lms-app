'use client';

import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquare, CheckCircle, Smile, Meh, Frown } from 'lucide-react';
import { useParams } from 'next/navigation';

const FeedbackModal = ({ form, onClose, onSuccess }) => {
    const { id } = useParams();
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setAnimateIn(true), 10);
        return () => clearTimeout(timer);
    }, []);

    if (!form) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const missingRequired = form.questions.some(q => q.is_required && !answers[q.id]);
        if (missingRequired) {
            alert('Please answer all required questions.');
            setSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`/api/courses/${id}/feedback/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_id: form.id,
                    answers: answers
                })
            });

            if (response.ok) {
                setIsSuccess(true);
                if (onSuccess) onSuccess();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRating = (questionId, rating) => {
        setAnswers(prev => ({ ...prev, [questionId]: rating }));
    };

    const handleText = (questionId, text) => {
        setAnswers(prev => ({ ...prev, [questionId]: text }));
    };

    const getRatingIcon = (rating, isSelected) => {
        return <Star size={32} fill={isSelected ? '#fbbf24' : 'none'} color={isSelected ? '#d97706' : '#9ca3af'} />;
    };

    // Success View
    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] transition-opacity duration-300" onClick={onClose}>
                <div
                    className={`bg-white rounded-2xl w-[90%] max-w-[550px] max-h-[90vh] shadow-2xl overflow-hidden transition-all duration-400 text-center p-10 ${animateIn ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-2.5 opacity-0'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                        <CheckCircle size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
                    <p className="text-gray-500 mb-8">Your feedback helps us improve the learning experience.</p>
                    <button
                        onClick={onClose}
                        className="py-3 px-8 bg-emerald-500 text-white border-none rounded-lg font-semibold text-base cursor-pointer shadow-lg transition-colors hover:bg-emerald-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
            <div
                className={`bg-white rounded-2xl w-[90%] max-w-[550px] max-h-[90vh] shadow-2xl overflow-hidden transition-all duration-400 ${animateIn ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-2.5 opacity-0'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Gradient */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <div className="inline-flex py-1.5 px-3 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold mb-3">
                            We'd love your input
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 m-0">
                            {form.name || 'Course Feedback'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-white border border-gray-200 rounded-lg p-2 cursor-pointer text-gray-500 transition-all flex items-center justify-center hover:border-gray-300 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="py-6 px-8 max-h-[60vh] overflow-y-auto">
                    <div className="flex flex-col gap-8">
                        {form.questions.map((q, index) => (
                            <div key={q.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                <label className="block text-base font-semibold mb-3 text-gray-700">
                                    {q.question_text}
                                    {q.is_required && <span className="text-red-500 ml-1">*</span>}
                                </label>

                                {q.question_type === 'rating' ? (
                                    <div className="flex gap-3 p-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => handleRating(q.id, star)}
                                                className={`bg-transparent border-none cursor-pointer p-0 transition-transform ${answers[q.id] === star ? 'scale-110' : 'scale-100'}`}
                                            >
                                                {getRatingIcon(star, (answers[q.id] || 0) >= star)}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <textarea
                                        rows={4}
                                        value={answers[q.id] || ''}
                                        onChange={(e) => handleText(q.id, e.target.value)}
                                        placeholder="Share your thoughts..."
                                        className="w-full p-4 border border-gray-300 rounded-xl text-[15px] resize-y bg-gray-50 transition-all outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 flex justify-end gap-4 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="py-3 px-6 rounded-lg border border-gray-200 bg-white text-gray-600 font-semibold cursor-pointer transition-all hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`py-3 px-8 rounded-lg border-none bg-blue-600 text-white font-semibold cursor-pointer flex items-center gap-2 shadow-lg transition-all ${submitting ? 'cursor-wait scale-98' : 'hover:bg-blue-700'}`}
                        >
                            {submitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
