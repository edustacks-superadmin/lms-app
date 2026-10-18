'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdvancedPagination from './AdvancedPagination';

export default function PublicPostPagination({ totalItems, itemsPerPage, currentPage }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const handlePageChange = (page) => {
        const params = new URLSearchParams(searchParams.toString());
        if (page > 1) {
            params.set('page', page);
        } else {
            params.delete('page');
        }

        router.push(`/posts?${params.toString()}`, { scroll: true });
    };

    if (totalItems <= itemsPerPage) return null;

    return (
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <AdvancedPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
            />
        </div>
    );
}
