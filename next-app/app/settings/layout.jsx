'use client';

import React from 'react';
import SettingsSidebar from '../../components/SettingsSidebar';

export default function SettingsLayout({ children }) {
    return (
        <div className="flex h-[calc(100vh-var(--header-height))] bg-slate-50 overflow-hidden">
            <SettingsSidebar />
            <main className="flex-1 h-full overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
