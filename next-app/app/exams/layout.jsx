'use client';

import React from 'react';
import ExamsSidebar from '../../components/ExamsSidebar';
import { usePathname } from 'next/navigation';

export default function ExamsLayout({ children }) {
    const pathname = usePathname();
    const isPrintPage = pathname?.endsWith('/print');

    if (isPrintPage) {
        return <div className="bg-white min-h-screen">{children}</div>;
    }

    return (
        <div className="flex min-h-[calc(100vh-var(--header-height))] bg-white items-start">
            <ExamsSidebar />
            <div className="flex-1 p-0 max-w-[1200px]">
                {children}
            </div>
        </div>
    );
}
