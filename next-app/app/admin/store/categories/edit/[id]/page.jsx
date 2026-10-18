'use client';

import React from 'react';
import AdminLayout from '../../../../../../components/AdminLayout';
import AdminStoreSidebar from '../../../../../../components/AdminStoreSidebar';
import EditProductCategory from '../../../../../../components/EditProductCategory';

const EditProductCategoryPage = ({ params }) => {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <AdminStoreSidebar />
                <main className="lg:ml-64 p-8">
                    <EditProductCategory categoryId={id} />
                </main>
            </div>
        </AdminLayout>
    );
};

export default EditProductCategoryPage;
