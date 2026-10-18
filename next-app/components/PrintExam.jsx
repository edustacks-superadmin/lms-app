'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getExamQuestionsWithOptions, getExamById } from '../app/actions/exam';
import MathText from './MathText';

const PrintExam = ({ examId }) => {
    const searchParams = useSearchParams();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const showQuestionText = searchParams.get('show_question_text') === '1';
    const showOptions = searchParams.get('show_options') === '1';
    const showAnswer = searchParams.get('show_answer') === '1';
    const showExplanation = searchParams.get('show_explanation') === '1';
    const showSubject = searchParams.get('show_subject') === '1';
    const showDifficulty = searchParams.get('show_difficulty') === '1';

    useEffect(() => {
        const loadData = async () => {
            if (!examId) return;
            setLoading(true);
            try {
                // Use server actions (Prisma) to bypass RLS on question_options
                const [examData, questionsData] = await Promise.all([
                    getExamById(examId),
                    getExamQuestionsWithOptions(examId)
                ]);
                setExam(examData);
                setQuestions(questionsData || []);
                console.log('Loaded questions:', questionsData?.length, 'First options:', questionsData?.[0]?.questions?.options?.length);
            } catch (error) {
                console.error('Error loading print data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [examId]);

    if (loading) return <div className="p-5">Preparing print preview...</div>;
    if (!exam) return <div className="p-5">Exam not found</div>;

    return (
        <div className="print-container max-w-[1000px] mx-auto p-10 bg-white text-black font-serif">
            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 20mm; }
                    body { background: white; }
                    .no-print { display: none; }
                    .page-break { page-break-after: always; }
                    .print-container { padding: 0 !important; width: 100% !important; max-width: 100% !important; }
                }
                .question-item { margin-bottom: 30px; line-height: 1.6; }
                .option-item { margin-left: 20px; margin-top: 5px; }
                .meta-badge { font-family: sans-serif; font-size: 11px; padding: 2px 6px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; color: #555; }
            ` }} />

            {/* Header Controls (No print) */}
            <div className="no-print fixed bottom-0 left-0 right-0 flex justify-center gap-4 p-4 bg-white/90 backdrop-blur-sm border-t border-gray-300 shadow-sm z-[100]">
                <button
                    onClick={() => window.print()}
                    className="py-2.5 px-8 bg-blue-500 text-white border-none rounded font-semibold text-sm cursor-pointer hover:bg-blue-600"
                >
                    Print / Save to PDF
                </button>
                <button
                    onClick={() => window.close()}
                    className="py-2.5 px-8 bg-white text-gray-700 border border-gray-300 rounded font-medium text-sm cursor-pointer hover:bg-gray-50"
                >
                    Close
                </button>
            </div>

            {/* Exam Header */}
            <div className="text-center mb-10 border-b-2 border-black pb-5">
                <h1 className="text-3xl m-0 mb-2.5">{exam.title}</h1>
                <div className="flex justify-center gap-10 text-sm font-bold">
                    <span>Max Marks: {exam.total_marks || 0}</span>
                    <span>Duration: {exam.duration_minutes} Minutes</span>
                    <span>Questions: {exam.number_of_questions || 0}</span>
                </div>
                {exam.description && (
                    <div className="mt-4 text-sm italic max-w-[800px] mx-auto">
                        <MathText>{exam.description}</MathText>
                    </div>
                )}
            </div>

            {/* Questions List */}
            <div className="questions-list">
                {questions.map((qItem, index) => {
                    const q = qItem.questions;
                    if (!q) return null;

                    return (
                        <div key={qItem.id} className="question-item" style={{ pageBreakInside: 'avoid' }}>
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-start font-bold text-base flex-1">
                                    <span className="mr-2.5 shrink-0">{index + 1}.</span>
                                    <div className="flex-1">
                                        {showQuestionText && <MathText>{q.question_text}</MathText>}
                                        {!showQuestionText && showAnswer && !showExplanation && (
                                            <span>Correct Answer: {q.options?.filter(o => o.is_correct).map(o => o.option_label).join(', ') || 'N/A'}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0 ml-5">
                                    {(showQuestionText || showOptions) && <span className="meta-badge">Marks: {qItem.marks || 0}</span>}
                                    {showSubject && q.subjects?.name && <span className="meta-badge">{q.subjects.name}</span>}
                                    {showDifficulty && <span className="meta-badge capitalize">{q.difficulty || 'medium'}</span>}
                                </div>
                            </div>

                            {/* Options */}
                            {showOptions && q.options && q.options.length > 0 && (
                                <div className="mt-2.5 ml-6">
                                    {q.options.sort((a, b) => a.option_label.localeCompare(b.option_label)).map(opt => (
                                        <div key={opt.id} className="option-item flex items-start mb-2">
                                            <span className="font-bold mr-3 shrink-0 min-w-[25px]">({opt.option_label})</span>
                                            <div className="flex-1">
                                                <MathText>{opt.option_text}</MathText>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Answer & Explanation */}
                            {(showAnswer || showExplanation) && (
                                <div className={`mt-2.5 pt-1.5 ${showQuestionText ? 'ml-6 border-t border-dashed border-gray-200' : ''}`}>
                                    {showAnswer && (showQuestionText || showExplanation) && (
                                        <div className="text-sm font-bold text-black">
                                            Correct Answer: {q.options?.filter(o => o.is_correct).map(o => o.option_label).join(', ') || 'N/A'}
                                        </div>
                                    )}
                                    {showExplanation && q.explanation && (
                                        <div className="mt-1.5 text-sm">
                                            <span className="font-bold">Explanation:</span>
                                            <div className="mt-1">
                                                <MathText>{q.explanation}</MathText>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Print Footer */}
            <div className="mt-12 pt-2.5 border-t border-black text-xs text-center text-gray-500">
                Printed from {window.location.host} on {new Date().toLocaleDateString()}
            </div>
        </div>
    );
};

export default PrintExam;
