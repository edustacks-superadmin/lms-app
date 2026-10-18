'use client';

import React from 'react';
import PublicProductDetail from '../../../../components/PublicProductDetail';

const ProductDetailPage = ({ params }) => {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <div className="min-h-screen bg-slate-50">
            <main>
                <PublicProductDetail productId={id} />
            </main>
        </div>
    );
};

export default ProductDetailPage;
