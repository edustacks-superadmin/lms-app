import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    itemsPerPageOptions = [20, 50, 100],
    itemName = 'entries'
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (totalItems <= 0) return null;

    const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
    const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 7;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (currentPage <= 4) {
                for (let i = 2; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div style={{
            padding: '16px 0',
            marginTop: '20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
        }}>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>
                    Showing <strong style={{ color: '#111827' }}>{totalItems === 0 ? 0 : indexOfFirstItem + 1}</strong> to <strong style={{ color: '#111827' }}>{indexOfLastItem}</strong> of <strong style={{ color: '#111827' }}>{totalItems}</strong> {itemName}
                </span>

                {onItemsPerPageChange && itemsPerPageOptions && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>Per page:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                onItemsPerPageChange(Number(e.target.value));
                                onPageChange(1);
                            }}
                            style={{
                                padding: '4px 8px',
                                fontSize: '13px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                cursor: 'pointer'
                            }}
                        >
                            {itemsPerPageOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        title="Previous Page"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {getPageNumbers().map((page, idx) => (
                        page === '...' ? (
                            <span
                                key={`ellipsis-${idx}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    color: '#9ca3af'
                                }}
                            >
                                ...
                            </span>
                        ) : (
                            <button
                                key={`page-${page}`}
                                type="button"
                                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </button>
                        )
                    ))}

                    <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        title="Next Page"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Pagination;
