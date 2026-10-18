'use client';

import React from 'react';
import AdminLayout from '../../../../../components/AdminLayout';
import AdminStoreSidebar from '../../../../../components/AdminStoreSidebar';
import CreateProductCategory from '../../../../../components/CreateProductCategory';

const CreateProductCategoryPage = () => {
    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <AdminStoreSidebar />
                <main className="lg:ml-64 p-8">
                    <CreateProductCategory />
                </main>
            </div>
        </AdminLayout>
    );
};

export default CreateProductCategoryPage;
