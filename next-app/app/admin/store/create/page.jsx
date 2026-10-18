'use client';

import React from 'react';
import AdminLayout from '../../../../components/AdminLayout';
import AdminStoreSidebar from '../../../../components/AdminStoreSidebar';
import ProductForm from '../../../../components/ProductForm';

const CreateProductPage = () => {
    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <AdminStoreSidebar />
                <main className="lg:ml-64 p-8">
                    <ProductForm />
                </main>
            </div>
        </AdminLayout>
    );
};

export default CreateProductPage;
