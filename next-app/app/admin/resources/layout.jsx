'use client';

import React, { useState } from 'react';
import ResourcesSidebar from '../../../components/ResourcesSidebar';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';

export default function ResourcesLayout({ children }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleFilterChange = (filters) => {
        const params = new URLSearchParams(searchParams);
        if (filters.category) params.set('category', filters.category);
        else params.delete('category');

        if (filters.search) params.set('search', filters.search);
        else params.delete('search');

        router.push(`/admin/resources?${params.toString()}`);
    };

    return (
        <AdminLayout>
            <div className="flex min-h-screen bg-slate-50">
                <ResourcesSidebar onFilterChange={handleFilterChange} />
                <main className="flex-1 lg:ml-64 p-8">
                    {children}
                </main>
            </div>
        </AdminLayout>
    );
}
