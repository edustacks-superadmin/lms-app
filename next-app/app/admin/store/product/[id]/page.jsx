'use client';

import React from 'react';
import AdminLayout from '../../../../../components/AdminLayout';
import AdminStoreSidebar from '../../../../../components/AdminStoreSidebar';
import AdminProductDetail from '../../../../../components/AdminProductDetail';

const AdminProductDetailPage = ({ params }) => {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <React.Suspense fallback={<div className="w-64 bg-white border-r border-slate-200 h-screen" />}>
                    <AdminStoreSidebar />
                </React.Suspense>
                <main className="lg:ml-64 p-8">
                    <React.Suspense fallback={
                        <div className="flex items-center justify-center p-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                        </div>
                    }>
                        <AdminProductDetail productId={id} />
                    </React.Suspense>
                </main>
            </div>
        </AdminLayout>
    );
};

export default AdminProductDetailPage;
