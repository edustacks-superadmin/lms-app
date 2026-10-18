'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCategories } from '../context/CategoryContext';
import { useInstitute } from '../context/InstituteContext';

const EditCategory = ({ categoryId }) => {
    const id = categoryId;
    const router = useRouter();
    const { getCategory, updateCategory, loading, fetchCategories, categories } = useCategories();
    const { institute } = useInstitute();

    const [category, setCategory] = useState(null);
    const [initialLoaded, setInitialLoaded] = useState(false);

    // Fetch categories if not loaded
    useEffect(() => {
        if (institute?.id) {
            fetchCategories(institute.id);
        }
    }, [institute?.id]);


    useEffect(() => {
        if (loading || initialLoaded) return;

        const data = getCategory(id);

        if (data) {
            setCategory(data);
            setInitialLoaded(true);
        }
    }, [id, getCategory, loading, initialLoaded, categories]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCategory(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleUpdate = async () => {
        await updateCategory(id, category);
        router.push('/admin/posts/categories');
    };

    if (loading) return <div>Loading...</div>;
    if (!category) return <div>Category not found</div>;

    return (
        <div className="flex-1">
            <h2 className="text-2xl font-normal mb-8 border-b border-gray-200 pb-4">
                Edit - {category.name}
            </h2>

            <div className="max-w-xl">
                {/* Name */}
                <div className="flex mb-5 items-center">
                    <label className="w-[150px] font-bold text-gray-600 text-right mr-5">Name:</label>
                    <input
                        type="text"
                        name="name"
                        value={category.name}
                        onChange={handleChange}
                        className="form-control flex-1"
                    />
                </div>

                {/* Color */}
                <div className="flex mb-5 items-center">
                    <label className="w-[150px] font-bold text-gray-600 text-right mr-5">Color:</label>
                    <div className="flex items-center gap-2.5">
                        <input
                            type="color"
                            name="color"
                            value={category.color}
                            onChange={handleChange}
                            className="w-[50px] h-[30px] p-0 border border-gray-300"
                        />
                    </div>
                </div>

                {/* Starred Category */}
                <div className="flex mb-5">
                    <label className="w-[150px] font-bold text-gray-600 text-right mr-5 pt-1">Starred category:</label>
                    <div>
                        <input
                            type="checkbox"
                            name="isStarred"
                            checked={category.isStarred}
                            onChange={handleChange}
                            className="scale-125"
                        />
                        <div className="text-xs text-gray-400 mt-1">Enable to list this category in quick link</div>
                    </div>
                </div>

                {/* For Forum */}
                <div className="flex mb-8 items-center">
                    <label className="w-[150px] font-bold text-gray-600 text-right mr-5">For forum:</label>
                    <input
                        type="checkbox"
                        name="forForum"
                        checked={category.forForum}
                        onChange={handleChange}
                        className="scale-125"
                    />
                </div>

                {/* Buttons */}
                <div className="flex gap-2.5 ml-[170px]">
                    <button
                        className="btn bg-teal-500 text-white border-none hover:bg-teal-600"
                        onClick={handleUpdate}
                    >
                        Update category
                    </button>
                    <button
                        className="btn bg-gray-200 text-gray-700 border-none hover:bg-gray-300"
                        onClick={() => router.push('/admin/posts/categories')}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditCategory;
