'use client';

import React from 'react';
import StoreSidebar from '../../../../../components/StoreSidebar';
import ProductForm from '../../../../../components/ProductForm';

const EditProductPage = ({ params }) => {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <div className="min-h-screen bg-slate-50">
            <StoreSidebar />
            <main className="lg:ml-64 p-8">
                <ProductForm id={id} />
            </main>
        </div>
    );
};

export default EditProductPage;
