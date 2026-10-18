'use client';

import React from 'react';
import GallerySidebar from '../../../components/GallerySidebar';
import AdminLayout from '../../../components/AdminLayout';

export default function GalleryLayout({ children }) {
    return (
        <AdminLayout>
            <div className="flex min-h-screen bg-slate-50">
                <GallerySidebar />
                <main className="flex-1 lg:ml-64 p-8">
                    {children}
                </main>
            </div>
        </AdminLayout>
    );
}
