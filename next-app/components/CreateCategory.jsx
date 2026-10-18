'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCategories } from '../context/CategoryContext';

const CreateCategory = () => {
    const router = useRouter();
    const { addCategory } = useCategories();

    const [category, setCategory] = useState({
        name: '',
        color: '#000000',
        isStarred: false,
        forForum: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCategory(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCreate = async () => {
        if (!category.name) return; // Basic validation
        await addCategory(category);
        router.push('/admin/posts/categories');
    };

    return (
        <div className="flex-1">
            <h2 className="text-2xl font-normal mb-8 border-b border-gray-200 pb-4">
                Create category
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
                        onClick={handleCreate}
                    >
                        Create category
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

export default CreateCategory;
