'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCategories } from '../context/CategoryContext';
import { XCircle } from 'lucide-react';

const DeleteCategory = ({ categoryId }) => {
    const id = categoryId;
    const router = useRouter();
    const { getCategory, deleteCategory, loading } = useCategories();
    const [category, setCategory] = useState(null);

    useEffect(() => {
        if (loading) return;

        const data = getCategory(id);
        if (data) {
            setCategory(data);
        } else {
            router.push('/admin/posts/categories');
        }
    }, [id, getCategory, router, loading]);

    const handleDelete = async () => {
        await deleteCategory(id);
        router.push('/admin/posts/categories');
    };

    if (!category) return <div>Loading...</div>;

    return (
        <div className="flex-1">
            <h2 className="text-2xl font-normal mb-8 border-b border-gray-200 pb-4">
                Delete - {category.name}
            </h2>

            <div className="max-w-[600px]">
                <p className="text-base mb-2.5 text-gray-800">
                    Are you sure you want to delete the category {category.name}?
                </p>
                <p className="text-sm text-gray-500 mb-8">
                    – Deleting a category will remove it from all posts
                </p>

                <div className="flex gap-2.5">
                    <button
                        className="btn bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300"
                        onClick={() => router.push('/admin/posts/categories')}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn bg-red-600 text-white border-none flex items-center gap-1.5 hover:bg-red-700"
                        onClick={handleDelete}
                    >
                        <XCircle size={16} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteCategory;
