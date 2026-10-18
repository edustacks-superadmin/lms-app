'use client';

import React from 'react';
import AdminLayout from '../../../components/AdminLayout';
import Sidebar from '../../../components/Sidebar';

export default function PagesLayout({ children }) {
    return (
        <AdminLayout>
            <div className="flex min-h-screen bg-slate-50">
                <Sidebar
                    selectedTags={[]}
                    onTagsChange={() => { }}
                    sortBy=""
                    onSortChange={() => { }}
                />
                <main className="flex-1 lg:ml-64 p-8">
                    {children}
                </main>
            </div>
        </AdminLayout>
    );
}
