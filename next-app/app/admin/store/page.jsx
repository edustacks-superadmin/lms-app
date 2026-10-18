'use client';

import React from 'react';
import AdminLayout from '../../../components/AdminLayout';
import AdminStoreSidebar from '../../../components/AdminStoreSidebar';
import ProductList from '../../../components/ProductList';

const AdminStorePage = () => {
    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <React.Suspense fallback={<div className="w-64 bg-white border-r border-slate-200 h-screen" />}>
                    <AdminStoreSidebar />
                </React.Suspense>
                <main className="lg:ml-64 p-8">
                    <React.Suspense fallback={
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    }>
                        <ProductList />
                    </React.Suspense>
                </main>
            </div>
        </AdminLayout>
    );
};

export default AdminStorePage;
