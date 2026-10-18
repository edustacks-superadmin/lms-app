import React from 'react';
import { CheckCircle, Archive, Layers } from 'lucide-react';
import { useTags } from '../context/TagContext';

const Sidebar = ({ selectedTags = [], onTagsChange, sortBy = '', onSortChange, onApplyFilters }) => {
    const { tags, loading } = useTags();

    const handleTagToggle = (tagId) => {
        if (selectedTags.includes(tagId)) {
            onTagsChange(selectedTags.filter(id => id !== tagId));
        } else {
            onTagsChange([...selectedTags, tagId]);
        }
    };

    const sortOptions = [
        { value: 'title-asc', label: 'Title (A-Z)' },
        { value: 'title-desc', label: 'Title (Z-A)' },
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' }
    ];

    return (
        <aside style={{ width: '250px', flexShrink: 0, padding: '20px 16px 20px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="btn btn-primary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                    <CheckCircle size={16} /> Published
                </button>
                <button className="btn" style={{ justifyContent: 'flex-start', width: '100%', color: 'var(--text-light)', background: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Archive size={16} /> Archived Courses
                    <span style={{
                        fontSize: '9px',
                        backgroundColor: '#ffa726',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        marginLeft: 'auto'
                    }}>SOON</span>
                </button>
                <button className="btn" style={{ justifyContent: 'flex-start', width: '100%', color: 'var(--text-light)', background: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} /> Bundles
                    <span style={{
                        fontSize: '9px',
                        backgroundColor: '#ffa726',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        marginLeft: 'auto'
                    }}>SOON</span>
                </button>
            </div>

            <div style={{ marginTop: '32px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '12px' }}>Filter by Tags</h3>
                {loading ? (
                    <div style={{ fontSize: '12px', color: '#999' }}>Loading tags...</div>
                ) : tags.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#999' }}>No tags available</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tags.map(tag => (
                            <label
                                key={tag.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    padding: '4px 0'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedTags.includes(tag.id)}
                                    onChange={() => handleTagToggle(tag.id)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span
                                    style={{
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        backgroundColor: tag.color + '20',
                                        color: tag.color
                                    }}
                                >
                                    {tag.name}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '16px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '12px' }}>Sort by</h3>
                <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                >
                    <option value="">-- Select --</option>
                    {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <button
                className="btn btn-outline"
                style={{ marginTop: '20px', width: '100%' }}
                onClick={onApplyFilters}
            >
                Apply Filters
            </button>
        </aside>
    );
};

export default Sidebar;
