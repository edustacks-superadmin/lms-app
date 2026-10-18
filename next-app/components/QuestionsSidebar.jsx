'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { List, Navigation, AlertCircle, Folder, Tag, FileQuestion } from 'lucide-react';
import QuestionFilters from './QuestionFilters';

const QuestionsSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();

    const menuItems = [
        { icon: List, label: 'Questions', path: '/questions' },
        { icon: Navigation, label: 'Directions', path: '/questions/directions', comingSoon: true },
        { icon: AlertCircle, label: 'Reported', path: '/questions/reported' },
        { icon: Folder, label: 'Folders', path: '/questions/folders' },
        { icon: Tag, label: 'Subjects', path: '/questions/subjects' }
    ];

    return (
        <aside className="w-64 border-r border-slate-200 bg-white h-full overflow-y-auto hidden lg:block scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-6 px-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <FileQuestion size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Question Bank
                    </h3>
                </div>

                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;

                        return (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                    ${isActive
                                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} />
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.comingSoon && (
                                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        SOON
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>
            <QuestionFilters />
        </aside>
    );
};

export default QuestionsSidebar;
