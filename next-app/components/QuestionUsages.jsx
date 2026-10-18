import React, { useState, useRef, useEffect } from 'react';
import { ArrowRightLeft, Folder, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

const QuestionUsages = ({ usages = [] }) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Filter usages
    const folders = usages ? usages.filter(u => u.type === 'folder') : [];
    const exams = usages ? usages.filter(u => u.type === 'exam') : [];
    const isEmpty = folders.length === 0 && exams.length === 0;

    return (
        <div className="relative inline-block" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-transparent border-none p-0 text-blue-600 text-[13px] cursor-pointer flex items-center gap-1 no-underline hover:underline"
            >
                <ArrowRightLeft size={14} />
                List Usages
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-300 rounded shadow-lg z-[1000] min-w-[250px] max-w-[300px] p-3 text-left">
                    {/* Arrow/Triangle */}
                    <div className="absolute top-full left-1/2 -ml-[5px] border-[5px] border-solid border-t-gray-300 border-x-transparent border-b-transparent"></div>
                    <div className="absolute top-full left-1/2 -ml-[5px] -mt-px border-[5px] border-solid border-t-white border-x-transparent border-b-transparent"></div>

                    {isEmpty && (
                        <div className="text-[13px] text-gray-600 p-1">
                            Not used in any Exams or Enrolment Sets.
                        </div>
                    )}

                    {folders.length > 0 && (
                        <div className="mb-3">
                            <div className="text-[11px] font-bold text-gray-600 uppercase mb-1 flex items-center gap-1">
                                <Folder size={12} /> Question Set
                            </div>
                            <ul className="list-none p-0 m-0">
                                {folders.map((folder, idx) => (
                                    <li
                                        key={idx}
                                        onClick={() => {
                                            setIsOpen(false);
                                            router.push(`/questions/folders/${folder.id}`);
                                        }}
                                        className="text-[13px] py-0.5 text-blue-600 cursor-pointer hover:underline"
                                    >
                                        {folder.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {exams.length > 0 && (
                        <div>
                            <div className="text-[11px] font-bold text-gray-600 uppercase mb-1 flex items-center gap-1">
                                <FileText size={12} /> Exams
                            </div>
                            <ul className="list-none p-0 m-0">
                                {exams.map((exam, idx) => (
                                    <li
                                        key={idx}
                                        onClick={() => {
                                            setIsOpen(false);
                                            router.push(`/exams/${exam.id}/questions`);
                                        }}
                                        className="text-[13px] py-0.5 text-blue-600 cursor-pointer hover:underline"
                                    >
                                        {exam.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuestionUsages;
