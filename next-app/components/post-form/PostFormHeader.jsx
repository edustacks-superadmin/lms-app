import React from 'react';
import { ArrowLeft } from 'lucide-react';

const PostFormHeader = ({ isEdit, onBack }) => {
    return (
        <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
                <ArrowLeft size={24} className="text-gray-700" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">
                {isEdit ? 'Edit Post' : 'Create Post'}
            </h1>
        </div>
    );
};

export default PostFormHeader;
