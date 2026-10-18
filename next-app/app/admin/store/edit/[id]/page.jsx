'use client';

import React from 'react';
import AdminLayout from '../../../../../components/AdminLayout';
import AdminStoreSidebar from '../../../../../components/AdminStoreSidebar';
import ProductForm from '../../../../../components/ProductForm';

const EditProductPage = ({ params }) => {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <AdminStoreSidebar />
                <main className="lg:ml-64 p-8">
                    <ProductForm id={id} />
                </main>
            </div>
        </AdminLayout>
    );
};

export default EditProductPage;
