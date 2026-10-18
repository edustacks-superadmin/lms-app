'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, FileText, Bell } from 'lucide-react';

const ResourceTabs = ({ labels }) => {
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category') || 'Syllabus'; // Default to Syllabus if none

    const tabs = [
        {
            id: 'Syllabus',
            label: labels?.label_resource_syllabus || 'Syllabus',
            icon: BookOpen
        },
        {
            id: 'Previous Year Papers',
            label: labels?.label_resource_pyq || 'Previous Year Papers',
            icon: FileText
        },
        {
            id: 'Notification',
            label: labels?.label_resource_notifications || 'Notifications',
            icon: Bell
        },
    ];

    return (
        <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar bg-white sticky top-0 z-10">
            <div className="flex min-w-full px-4 md:px-0">
                {tabs.map((tab) => {
                    const isActive = currentCategory === tab.id;
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.id}
                            href={`/resources?category=${encodeURIComponent(tab.id)}`}
                            className={`
                                flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap
                                ${isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                }
                            `}
                        >
                            <Icon size={18} />
                            <span>{tab.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default ResourceTabs;
