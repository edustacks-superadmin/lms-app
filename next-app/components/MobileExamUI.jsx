import React from 'react';
import MathText from './MathText';
import { Bookmark, X, ChevronLeft, Check, List, HelpCircle, AlertTriangle, Play, Pause, ChevronRight, Flag } from 'lucide-react';

const MobileExamUI = ({
    exam,
    questions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    answers,
    handleAnswer,
    handleNext,
    handleMarkForReview,
    clearResponse,
    timeLeft,
    formatTime,
    showSubmitModal,
    setShowSubmitModal,
    handleSubmit,
    submitting,
    stats,
    showSidebar,
    setShowSidebar,
    getQuestionStatus,
    bookmarks,
    toggleBookmark,
    showReportModal,
    setShowReportModal,
    setVisited,
    setAnswers,
    setShowAnswer,
    showAnswer,
    isQuizMode,
    handleCheckAnswer,
    reportType,
    setReportType,
    reportComment,
    setReportComment,
    handleReportSubmit,
    reporting,
    getUnansweredMandatory,
    isPaused,
    setIsPaused,
    fontSize // Added prop
}) => {

    const currentQuestion = questions[currentQuestionIndex];

    const handleQuizNext = () => {
        setShowAnswer(false);
        handleNext(true);
    };

    const getDataTextSizeClass = () => {
        switch (fontSize) {
            case 'small': return 'text-sm';
            case 'large': return 'text-xl';
            default: return 'text-base';
        }
    };

    const textSizeClass = getDataTextSizeClass();

    return (
        <div className="flex flex-col h-screen bg-white font-sans text-slate-900">
            {/* Mobile Header */}
            <div className="flex justify-between items-center px-4 h-[60px] bg-white border-b border-gray-200 shadow-sm shrink-0 z-30">
                <button
                    onClick={() => setShowSubmitModal(true)}
                    className="text-blue-600 font-bold text-base hover:text-blue-700 transition-colors"
                >
                    Submit
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="text-xl p-1 leading-none hover:text-blue-600 transition-colors"
                    >
                        {isPaused ? <Play size={20} className="fill-current" /> : <Pause size={20} className="fill-current" />}
                    </button>
                    <div className={`font-mono text-base font-bold px-2 py-0.5 rounded ${timeLeft < 300 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar (Overlay) */}
            {showSidebar && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="w-[85%] max-w-[320px] bg-white h-full flex flex-col shadow-2xl animate-slide-in-left z-50">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
                            <div className="font-bold text-lg text-slate-800">Question Palette</div>
                            <button onClick={() => setShowSidebar(false)} className="text-slate-500 hover:text-slate-700"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((q, idx) => {
                                    const status = getQuestionStatus(q.id, idx);
                                    let btnClasses = "h-10 w-full flex items-center justify-center text-sm font-bold transition-all relative rounded ";

                                    if (status === 'answered') btnClasses += "bg-emerald-500 text-white border border-emerald-600";
                                    else if (status === 'not-answered') btnClasses += "bg-rose-500 text-white border border-rose-600";
                                    else if (status === 'marked') btnClasses += "bg-purple-600 text-white border border-purple-700 rounded-full";
                                    else if (status === 'answered-marked') btnClasses += "bg-purple-600 text-white border border-purple-700 rounded-full ring-2 ring-emerald-400 ring-offset-1";
                                    else btnClasses += "bg-white text-slate-700 border border-slate-300 hover:border-blue-400";

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => {
                                                setCurrentQuestionIndex(idx);
                                                setVisited(prev => new Set(prev).add(idx));
                                                setShowSidebar(false);
                                                setShowAnswer(false);
                                            }}
                                            className={btnClasses}
                                        >
                                            {idx + 1}
                                            {status === 'answered-marked' && (
                                                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-slate-50 text-xs text-slate-600">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-emerald-500 block shadow-sm"></span> Answered</div>
                                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-rose-500 block shadow-sm"></span> Not Ans</div>
                                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-purple-600 block shadow-sm"></span> Review</div>
                                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-white border border-slate-300 block shadow-sm"></span> No Visit</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowSidebar(false)}></div>
                </div>
            )}

            {/* Pause Overlay - Mobile */}
            {isPaused && (
                <div className="fixed inset-0 bg-slate-900/95 z-[9999] flex flex-col justify-center items-center p-6 text-center animate-fade-in">
                    <div className="text-7xl mb-6">⏸</div>
                    <div className="text-2xl font-bold text-white mb-2">Exam Paused</div>
                    <p className="text-slate-400 text-base max-w-xs mb-8 leading-relaxed">
                        Your timer is paused. Your answers have been saved.<br />Tap below to resume.
                    </p>
                    <button
                        onClick={() => setIsPaused(false)}
                        className="px-8 py-4 rounded-xl bg-emerald-500 text-white font-bold text-lg flex items-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                    >
                        <Play size={24} className="fill-current" /> Resume Exam
                    </button>
                </div>
            )}

            {/* Mobile Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-24 flex flex-col bg-white">
                {/* Row 1: Q No | Marks */}
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                    <span className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        Question {currentQuestionIndex + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {currentQuestion.marks || 1} Marks
                    </span>
                </div>

                {/* Row 2: Question Text */}
                <div className={`mb-6 leading-relaxed text-slate-800 ${textSizeClass}`}>
                    <MathText>{currentQuestion.question}</MathText>
                </div>

                {/* Row 3: Options */}
                <div className="flex flex-col gap-3">
                    {currentQuestion.options && currentQuestion.options.map((option, idx) => {
                        const isSelected = answers[currentQuestion.id] === idx;
                        const isCorrect = idx === currentQuestion.correctAnswerIndex;

                        let borderClass = 'border-slate-200';
                        let bgClass = 'bg-white';
                        let textClass = 'text-slate-700';

                        // Quiz Mode Styles
                        if (isQuizMode && showAnswer) {
                            if (isCorrect) {
                                borderClass = 'border-emerald-500';
                                bgClass = 'bg-emerald-50';
                                textClass = 'text-emerald-900';
                            } else if (isSelected) {
                                borderClass = 'border-rose-500';
                                bgClass = 'bg-rose-50';
                                textClass = 'text-rose-900';
                            }
                        } else if (isSelected) {
                            borderClass = 'border-blue-500';
                            bgClass = 'bg-blue-50';
                            textClass = 'text-blue-900';
                        }

                        return (
                            <label key={idx} className={`flex items-start p-4 border-2 rounded-xl transition-all active:scale-[0.99] ${borderClass} ${bgClass} cursor-pointer`}>
                                <div className="pt-0.5 mr-3 shrink-0">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                </div>
                                <input
                                    type="radio"
                                    name={`q-${currentQuestion.id}`}
                                    className="hidden"
                                    checked={isSelected}
                                    onChange={() => !showAnswer && handleAnswer(idx)}
                                    disabled={isQuizMode && showAnswer}
                                />
                                <span className={`${textSizeClass} ${textClass} leading-snug`}><MathText>{option}</MathText></span>
                            </label>
                        );
                    })}
                </div>

                {/* Quiz Mode Explanation */}
                {isQuizMode && showAnswer && (
                    <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 animate-fade-in">
                        <h4 className="flex items-center gap-2 font-bold text-amber-800 mb-2 text-sm uppercase tracking-wide">
                            <HelpCircle size={16} /> Explanation:
                        </h4>
                        <div className="text-sm text-amber-900/80 leading-relaxed">
                            <MathText>{currentQuestion.explanation || "No explanation provided."}</MathText>
                        </div>
                    </div>
                )}

                {/* Center: Mark for Later */}
                <div className="flex justify-center mt-8 mb-4">
                    <button
                        onClick={handleMarkForReview}
                        className="flex items-center gap-2 bg-white border border-purple-600 text-purple-600 px-5 py-2 rounded-full text-xs font-bold shadow-sm active:bg-purple-50 transition-colors"
                    >
                        <Bookmark size={14} />
                        MARK FOR LATER
                    </button>
                    {/* Report Button (Mobile) */}
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="ml-3 flex items-center gap-2 bg-white border border-rose-500 text-rose-500 px-5 py-2 rounded-full text-xs font-bold shadow-sm active:bg-rose-50 transition-colors"
                    >
                        <Flag size={14} /> Report
                    </button>
                </div>
            </div>

            {/* Mobile Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-4 h-[70px] z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {/* Previous */}
                <button
                    onClick={() => {
                        const prevIndex = Math.max(0, currentQuestionIndex - 1);
                        setCurrentQuestionIndex(prevIndex);
                        setVisited(prev => new Set(prev).add(prevIndex));
                        setShowAnswer(false);
                    }}
                    disabled={currentQuestionIndex === 0}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${currentQuestionIndex === 0 ? 'bg-gray-100 text-gray-300' : 'bg-slate-100 text-slate-600 active:bg-slate-200'}`}
                >
                    <ChevronLeft size={24} />
                </button>

                {/* Question List Icon */}
                <button
                    onClick={() => setShowSidebar(true)}
                    className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm border border-blue-100 active:scale-95 transition-transform"
                >
                    <List size={26} />
                </button>

                {/* Next / Check Answer */}
                {isQuizMode && !showAnswer ? (
                    <button
                        onClick={handleCheckAnswer}
                        className="px-6 h-12 rounded-xl bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                    >
                        <span>Check</span>
                        <Check size={20} />
                    </button>
                ) : (
                    <button
                        onClick={() => isQuizMode ? handleQuizNext() : handleNext(true)}
                        className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 active:scale-95 transition-transform"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>

            {/* Submit Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-[320px] shadow-2xl animate-scale-in">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <HelpCircle size={20} className="text-blue-600" /> Submit Exam?
                        </h3>
                        <div className="space-y-2 mb-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
                            <div className="flex justify-between">
                                <span>Answered:</span> <span className="font-bold text-emerald-600">{stats.answered}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Not Answered:</span> <span className="font-bold text-rose-500">{stats.notAnswered}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Marked:</span> <span className="font-bold text-purple-600">{stats.marked}</span>
                            </div>
                        </div>
                        {getUnansweredMandatory && getUnansweredMandatory().length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg mb-4 text-xs flex items-start gap-2">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <span><strong>Warning:</strong> {getUnansweredMandatory().length} mandatory question(s) left.</span>
                            </div>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-slate-600 font-medium text-sm">Cancel</button>
                            <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md">
                                {submitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-5 rounded-2xl w-full max-w-[340px] shadow-2xl relative animate-scale-in">
                        <button
                            onClick={() => setShowReportModal(false)}
                            className="absolute top-4 right-4 text-slate-400"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Flag size={20} className="text-rose-500" /> Report Issue
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Type</label>
                                <select
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="flag">Flag Content</option>
                                    <option value="error">Question Error</option>
                                    <option value="feedback">General Feedback</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Details</label>
                                <textarea
                                    value={reportComment}
                                    onChange={(e) => setReportComment(e.target.value)}
                                    placeholder="Describe the issue..."
                                    className="w-full p-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 transition-colors min-h-[100px]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-slate-600 font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReportSubmit}
                                disabled={reporting}
                                className="px-5 py-2 rounded-xl bg-rose-500 text-white font-bold text-sm shadow-md"
                            >
                                {reporting ? '...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default MobileExamUI;
