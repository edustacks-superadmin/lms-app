'use client';

import React from 'react';
import { Lock, Clock, CheckCircle, List } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import CourseFilter from './CourseFilter';
import TagFilter from './TagFilter';

const ExamsSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();

    const isActive = (path) => pathname === path || pathname.startsWith(path);

    const NavItem = ({ path, icon: Icon, label, colorClass = "text-blue-600" }) => {
        const active = isActive(path);
        return (
            <button
                onClick={() => router.push(path)}
                className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${active
                        ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100 ring-1 ring-blue-200/50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
            >
                <div className={`
                    p-1.5 rounded-lg transition-colors
                    ${active ? 'bg-white/80' : 'bg-slate-100 group-hover:bg-white text-slate-500 group-hover:text-slate-700'}
                `}>
                    <Icon size={18} className={active ? colorClass : 'currentColor'} />
                </div>
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
            </button>
        );
    };

    return (
        <aside className="w-[280px] p-0 border-r border-slate-100 min-h-[calc(100vh-60px)] sticky top-20 self-start bg-white/50 backdrop-blur-sm">
            <div className="p-5 flex flex-col gap-6">

                {/* Primary Action */}
                <button
                    onClick={() => router.push('/exams/create')}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-200"
                >
                    <List size={20} />
                    <span>Create Exam</span>
                </button>

                {/* Navigation */}
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-1">Status</h3>

                    <NavItem
                        path="/exams/running"
                        icon={Lock}
                        label="Running Tests"
                        colorClass="text-emerald-500"
                    />
                    <NavItem
                        path="/exams/upcoming"
                        icon={Clock}
                        label="Upcoming Tests"
                        colorClass="text-amber-500"
                    />
                    <NavItem
                        path="/exams/completed"
                        icon={CheckCircle}
                        label="Completed Tests"
                        colorClass="text-purple-500"
                    />
                </div>

                {/* Separator */}
                <div className="h-px bg-slate-100 mx-2" />

                {/* Filters */}
                <CourseFilter />
                <TagFilter />
            </div>
        </aside>
    );
};

export default ExamsSidebar;
