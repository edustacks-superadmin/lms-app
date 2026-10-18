import React from 'react';
import { useTags } from '../context/TagContext';
import { X, Tag as TagIcon } from 'lucide-react';

const TagSelector = ({ selectedTags = [], onChange }) => {
    const { tags, loading } = useTags();

    const handleToggleTag = (tagId) => {
        if (selectedTags.includes(tagId)) {
            onChange(selectedTags.filter(id => id !== tagId));
        } else {
            onChange([...selectedTags, tagId]);
        }
    };

    const getTagById = (id) => tags.find(tag => tag.id === id);

    if (loading) {
        return <div style={{ padding: '10px', color: '#666' }}>Loading tags...</div>;
    }

    return (
        <div>
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedTags.map(tagId => {
                        const tag = getTagById(tagId);
                        if (!tag) return null;
                        return (
                            <span
                                key={tagId}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '14px',
                                    fontSize: '13px',
                                    fontWeight: '500',
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
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '2px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: 'inherit'
                                    }}
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
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    Select Tags
                </label>
                {tags.length === 0 ? (
                    <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
                        No tags available. Create tags in Tag Management first.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f9f9f9', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                        {tags.map(tag => {
                            const isSelected = selectedTags.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleToggleTag(tag.id)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '14px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        backgroundColor: isSelected ? tag.color : 'white',
                                        color: isSelected ? 'white' : tag.color,
                                        border: `1px solid ${tag.color}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <TagIcon size={12} />
                                    {tag.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TagSelector;
