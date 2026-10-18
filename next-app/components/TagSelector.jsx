'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useTags } from '../context/TagContext';
import { useInstitute } from '../context/InstituteContext';
import { X, Tag as TagIcon, Plus } from 'lucide-react';

const TagSelector = ({ selectedTags = [], onChange, type, showSelected = true }) => {
    const { tags, loading, fetchTags } = useTags();
    const { institute } = useInstitute();

    useEffect(() => {
        if (institute?.id) {
            fetchTags();
        }
    }, [institute?.id]);

    const handleToggleTag = (tagId) => {
        if (selectedTags.includes(tagId)) {
            onChange(selectedTags.filter(id => id !== tagId));
        } else {
            onChange([...selectedTags, tagId]);
        }
    };

    const getTagById = (id) => tags.find(tag => tag.id === id);

    // Filter tags based on type (show only 'all' or specific type)
    const filteredTags = React.useMemo(() => {
        if (!type || type === 'all') return tags;
        return tags.filter(tag => {
            const tagTypes = (tag.type || 'all').split(',');
            return tagTypes.includes('all') || tagTypes.includes(type);
        });
    }, [tags, type]);

    if (loading) {
        return <div className="p-2.5 text-gray-500">Loading tags...</div>;
    }

    return (
        <div>
            {/* Selected Tags */}
            {showSelected && selectedTags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {selectedTags.map(tagId => {
                        const tag = getTagById(tagId);
                        if (!tag) return null;
                        return (
                            <span
                                key={tagId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium"
                                style={{
                                    backgroundColor: tag.color + '20',
                                    color: tag.color,
                                    border: `1px solid ${tag.color}40`
                                }}
                            >
                                <TagIcon size={12} />
                                {tag.name}
                                <button
                                    type="button"
                                    onClick={() => handleToggleTag(tagId)}
                                    className="bg-transparent border-none p-0.5 cursor-pointer flex items-center text-inherit hover:opacity-70"
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Available Tags */}
            <div>
                <label className="block mb-2 font-medium text-sm">
                    Select Tags {type && <span className="text-gray-400 font-normal">({type} only)</span>}
                </label>
                {filteredTags.length === 0 ? (
                    <div className="p-3 bg-gray-50 rounded text-[13px] text-gray-500">
                        {tags.length > 0 ? (
                            <span>No tags found for this type.</span>
                        ) : (
                            <span>No tags available. <Link href="/settings/tags" target="_blank" className="text-blue-600 hover:underline">Create tags</Link> first.</span>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                        {filteredTags.map(tag => {
                            const isSelected = selectedTags.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleToggleTag(tag.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-all"
                                    style={{
                                        backgroundColor: isSelected ? tag.color : 'white',
                                        color: isSelected ? 'white' : tag.color,
                                        border: `1px solid ${tag.color}`
                                    }}
                                >
                                    <TagIcon size={12} />
                                    {tag.name}
                                </button>
                            );
                        })}
                    </div>
                )}
                <Link
                    href="/settings/tags"
                    target="_blank"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                    <Plus size={12} />
                    Create new tag
                </Link>
            </div>
        </div>
    );
};

export default TagSelector;
