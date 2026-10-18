'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const AdvancedPagination = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage = 10,
    onPageChange,
    onItemsPerPageChange,
    pageSizeOptions = [10, 20, 50, 100]
}) => {
    if (totalPages <= 0) return null;

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 7; // Maximum page buttons to show

        if (totalPages <= maxVisible) {
            // Show all pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage <= 4) {
                // Near the start
                for (let i = 2; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                // Near the end
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // In the middle
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

    const pageNumbers = getPageNumbers();
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const handleJumpToPage = (e) => {
        const page = parseInt(e.target.value);
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    return (
        <div className="flex flex-col gap-4 py-5 px-6 border-t border-slate-200">
            {/* Top row: Info and Items per page */}
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="text-sm text-slate-500">
                    Showing <strong className="font-semibold text-slate-700">{startItem}</strong> to <strong className="font-semibold text-slate-700">{endItem}</strong> of <strong className="font-semibold text-slate-700">{totalItems}</strong> items
                </div>

                {onItemsPerPageChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Items per page:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
                            className="px-3 py-1.5 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 cursor-pointer"
                        >
                            {pageSizeOptions.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Bottom row: Pagination controls */}
            <div className="flex justify-center items-center gap-2 flex-wrap">
                {/* First Page Button */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    title="First Page"
                    className={`flex items-center justify-center w-9 h-9 border border-slate-200 rounded transition-colors ${currentPage === 1
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                >
                    <ChevronsLeft size={18} />
                </button>

                {/* Previous Page Button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Previous Page"
                    className={`flex items-center justify-center w-9 h-9 border border-slate-200 rounded transition-colors ${currentPage === 1
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                >
                    <ChevronLeft size={18} />
                </button>

                {/* Page Number Buttons */}
                {pageNumbers.map((pageNum, index) => {
                    if (pageNum === '...') {
                        return (
                            <span
                                key={`ellipsis-${index}`}
                                className="px-2 text-slate-400 text-sm"
                            >
                                ...
                            </span>
                        );
                    }

                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={`min-w-[36px] h-9 px-3 border rounded text-sm font-medium transition-colors ${currentPage === pageNum
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}

                {/* Next Page Button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Next Page"
                    className={`flex items-center justify-center w-9 h-9 border border-slate-200 rounded transition-colors ${currentPage === totalPages
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                >
                    <ChevronRight size={18} />
                </button>

                {/* Last Page Button */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last Page"
                    className={`flex items-center justify-center w-9 h-9 border border-slate-200 rounded transition-colors ${currentPage === totalPages
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                >
                    <ChevronsRight size={18} />
                </button>

                {/* Jump to Page Input */}
                <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-slate-500">Go to:</span>
                    <input
                        type="number"
                        min="1"
                        max={totalPages}
                        placeholder={currentPage.toString()}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleJumpToPage(e);
                                e.target.value = '';
                            }
                        }}
                        className="w-16 px-2 py-1.5 border border-slate-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                    />
                </div>
            </div>
        </div>
    );
};

export default AdvancedPagination;
