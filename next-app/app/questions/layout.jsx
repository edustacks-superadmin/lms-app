'use client';

import React from 'react';
import QuestionsSidebar from '../../components/QuestionsSidebar';

export default function QuestionsLayout({ children }) {
    return (
        <div className="flex h-[calc(100vh-var(--header-height))] bg-slate-50 overflow-hidden">
            <QuestionsSidebar />
            <main className="flex-1 h-full overflow-y-auto w-full">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
