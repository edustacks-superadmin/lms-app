import React from 'react';
import TagSelector from '../TagSelector';

const MetaDataSection = ({ formData, categories, onChange, onTagsChange }) => {
    return (
        <div className="space-y-6 py-6 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Category */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Category</label>
                    <select
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={onChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                        required
                    >
                        <option value="">Select a category...</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={onChange}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none transition-all bg-white
                            ${formData.status === 'published'
                                ? 'border-emerald-200 text-emerald-700 focus:ring-emerald-500'
                                : 'border-amber-200 text-amber-700 focus:ring-amber-500'}`}
                    >
                        <option value="draft">Draft (Private)</option>
                        <option value="published">Published (Visible)</option>
                    </select>
                </div>

                {/* Publication Date */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Publication Date (Scheduled)</label>
                    <input
                        type="datetime-local"
                        name="publicationDate"
                        value={formData.publicationDate}
                        onChange={onChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Setting a future date will hide the post from students until then.
                    </p>
                </div>
            </div>

            {/* Tag Selection */}
            <div className="py-4 bg-gray-50/50 rounded-xl border border-gray-100 p-4">
                <TagSelector
                    selectedTags={formData.tagIds || []}
                    onChange={onTagsChange}
                    type="post"
                    showSelected={true}
                />
            </div>

            {/* Toggles Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Comments Toggle */}
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <input
                        type="checkbox"
                        id="allowComments"
                        name="allowComments"
                        checked={formData.allowComments}
                        onChange={onChange}
                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                        <label htmlFor="allowComments" className="text-sm font-semibold text-gray-700 cursor-pointer">
                            Allow Student Comments
                        </label>
                        <span className="text-xs text-gray-500">Students can discuss and ask questions.</span>
                    </div>
                </div>

                {/* Featured Toggle */}
                <div className="flex items-center gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                    <input
                        type="checkbox"
                        id="isFeatured"
                        name="isFeatured"
                        checked={formData.isFeatured}
                        onChange={onChange}
                        className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                        <label htmlFor="isFeatured" className="text-sm font-semibold text-emerald-700 cursor-pointer">
                            Pin to Top (Featured)
                        </label>
                        <span className="text-xs text-emerald-600/70">Highlight this post at the top for all students.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetaDataSection;
