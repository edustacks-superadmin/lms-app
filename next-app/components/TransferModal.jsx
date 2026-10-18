import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Copy, ArrowRightCircle, Loader2, Check, ChevronDown, Search } from 'lucide-react';

const TransferModal = ({ isOpen, onClose, operation, item, itemType, currentCourseId }) => {
    const [courses, setCourses] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedChapterId, setSelectedChapterId] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingCourses, setFetchingCourses] = useState(false);
    const [fetchingChapters, setFetchingChapters] = useState(false);

    // Searchable Dropdown State
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [courseSearchTerm, setCourseSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchCourses();
            setSelectedCourseId('');
            setSelectedChapterId('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedCourseId) {
            fetchChapters(selectedCourseId);
        } else {
            setChapters([]);
        }
    }, [selectedCourseId]);

    const fetchCourses = async () => {
        setFetchingCourses(true);
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('id, title')
                .order('title');

            if (error) throw error;
            setCourses(data || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setFetchingCourses(false);
        }
    };

    const fetchChapters = async (courseId) => {
        setFetchingChapters(true);
        console.log('Fetching chapters for course:', courseId);
        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('id, name, parent_id')
                .eq('course_id', courseId)
                .order('order');

            if (error) {
                console.error('Supabase error fetching chapters:', error);
                // Try to log more details if possible
                console.error('Error details:', JSON.stringify(error, null, 2));
                throw error;
            }
            console.log('Chapters fetched:', data);

            // Organize hierarchically
            if (data) {
                const roots = data.filter(c => !c.parent_id).sort((a, b) => a.order - b.order);
                const children = data.filter(c => c.parent_id);

                let orderedChapters = [];
                roots.forEach(root => {
                    orderedChapters.push(root);
                    const rootChildren = children.filter(c => c.parent_id === root.id).sort((a, b) => a.order - b.order);
                    orderedChapters = [...orderedChapters, ...rootChildren];
                });

                // Add any orphans if necessary (or ignore them)
                // const orphans = children.filter(c => !roots.find(r => r.id === c.parent_id));
                // orderedChapters = [...orderedChapters, ...orphans];

                setChapters(orderedChapters);
            } else {
                setChapters([]);
            }
        } catch (error) {
            console.error('Error fetching chapters:', error);
            // If it's a network error or something else, it might show here
            if (error.message) console.error('Error message:', error.message);
        } finally {
            setFetchingChapters(false);
        }
    };

    // Filter root chapters for destination if moving a chapter to root or moving content
    // If moving a SUB-chapter, we might want to allow moving to another root chapter as parent
    // For simplicity, let's list all chapters that can accept the item.

    // If itemType is CONTENT, it must go into a Chapter (or Sub-chapter).
    // If itemType is CHAPTER (root), it goes to a Course (as root).
    // If itemType is SUBCHAPTER, it goes to a Chapter (as child).

    // Wait, the requirement says "Chapter or Sub chapter or content".
    // "Copy to Destinations": Select Course, Select Chapter.

    const canSelectChapter = itemType === 'CONTENT' || itemType === 'SUBCHAPTER';

    const handleSubmit = async () => {
        if (!selectedCourseId) return;
        if (canSelectChapter && !selectedChapterId) return;

        setLoading(true);
        try {
            // Perform the operation (Copy/Move)
            // We pass the selection back to the parent to handle the logic via Context
            await onClose({
                courseId: selectedCourseId,
                chapterId: selectedChapterId || null
            });
        } catch (error) {
            console.error('Error in transfer:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isCopy = operation === 'COPY';
    const Icon = isCopy ? Copy : ArrowRightCircle;
    const title = `${isCopy ? 'Copy' : 'Move'} ${itemType === 'content' ? 'Content' : 'Chapter'}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => onClose(null)} />

            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isCopy ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                            <p className="text-sm text-slate-500 font-medium truncate max-w-[250px]">{item?.title}</p>
                        </div>
                    </div>
                    <button onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Destination Course (Searchable Dropdown) */}
                    <div className="space-y-2 relative">
                        <label className="text-sm font-bold text-slate-700">Select Target Course</label>

                        <div
                            className={`w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer transition-all ${isCourseDropdownOpen ? 'ring-2 ring-blue-500/20 border-blue-500 bg-white' : 'hover:border-slate-300'}`}
                            onClick={() => {
                                if (!loading && !fetchingCourses) {
                                    setIsCourseDropdownOpen(!isCourseDropdownOpen);
                                    // Reset search on open
                                    if (!isCourseDropdownOpen) setCourseSearchTerm('');
                                }
                            }}
                        >
                            <span className={`font-medium truncate ${selectedCourseId ? 'text-slate-900' : 'text-slate-400'}`}>
                                {selectedCourseId
                                    ? courses.find(c => c.id === selectedCourseId)?.title || 'Selected Course'
                                    : 'Select a course...'
                                }
                            </span>
                            <ChevronDown size={18} className={`text-slate-400 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Dropdown Menu */}
                        {isCourseDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col max-h-[250px] animate-in fade-in zoom-in-95 origin-top">
                                {/* Search Bar */}
                                <div className="p-3 border-b border-slate-100 bg-white rounded-t-xl sticky top-0 z-10">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search courses..."
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            value={courseSearchTerm}
                                            onChange={(e) => setCourseSearchTerm(e.target.value)}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>

                                {/* Options List */}
                                <div className="overflow-y-auto flex-1 p-1">
                                    {courses.filter(c => c.title.toLowerCase().includes(courseSearchTerm.toLowerCase())).length > 0 ? (
                                        courses
                                            .filter(c => c.title.toLowerCase().includes(courseSearchTerm.toLowerCase()))
                                            .map(course => (
                                                <div
                                                    key={course.id}
                                                    onClick={() => {
                                                        setSelectedCourseId(course.id);
                                                        setIsCourseDropdownOpen(false);
                                                    }}
                                                    className={`px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer flex items-center justify-between group transition-colors ${selectedCourseId === course.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                                                >
                                                    <span className="truncate">{course.title}</span>
                                                    {selectedCourseId === course.id && <Check size={16} className="text-blue-600" />}
                                                </div>
                                            ))
                                    ) : (
                                        <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                            No courses found matching "{courseSearchTerm}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Overlay to close when clicking outside */}
                        {isCourseDropdownOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setIsCourseDropdownOpen(false)}></div>
                        )}
                    </div>

                    {/* Destination Chapter (Dynamic) */}
                    {canSelectChapter && (
                        <div className={`space-y-2 ${!selectedCourseId ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="text-sm font-bold text-slate-700">Select Target Chapter</label>
                            <select
                                value={selectedChapterId}
                                onChange={(e) => setSelectedChapterId(e.target.value)}
                                className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                disabled={loading || fetchingChapters || !selectedCourseId}
                            >
                                <option value="">Select a chapter...</option>
                                {chapters.map(chapter => (
                                    <option key={chapter.id} value={chapter.id}>
                                        {/* Indent sub-chapters if any, but fetching logic might just return flat list. Ideally show hierarchy */}
                                        {chapter.parent_id ? '  ↳ ' : ''}{chapter.name}
                                    </option>
                                ))}
                            </select>
                            {chapters.length === 0 && selectedCourseId && !fetchingChapters && (
                                <p className="text-xs text-amber-600">No chapters found in selected course.</p>
                            )}
                        </div>
                    )}

                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-slate-400">
                                <ArrowRightCircle size={16} />
                            </div>
                            <div className="text-xs text-slate-500 leading-relaxed">
                                {isCopy
                                    ? "A duplicate copy will be created in the selected destination. The original item will remain unchanged."
                                    : "The item will be moved to the selected destination and removed from its current location."
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                        onClick={() => onClose(null)}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedCourseId || (canSelectChapter && !selectedChapterId)}
                        className={`px-6 py-2 text-sm font-semibold text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2
                            ${loading || !selectedCourseId || (canSelectChapter && !selectedChapterId)
                                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                : isCopy ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                            }
                        `}
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {isCopy ? 'Copy Item' : 'Move Item'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferModal;
