import { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * Reusable Pagination Component
 * 
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of items/records
 * @param {number} itemsPerPage - Current items per page limit
 * @param {function} onPageChange - Callback when page changes (page) => void
 * @param {function} onLimitChange - Callback when limit changes (limit) => void
 * @param {array} limitOptions - Array of limit options, default: [6, 15, 20, 30, 50, 100]
 * @param {boolean} showLimitSelector - Whether to show the limit dropdown
 * @param {boolean} compact - Use compact styling
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    itemsPerPage = 15,
    onPageChange,
    onLimitChange,
    limitOptions = [6, 15, 20, 30, 50, 100],
    showLimitSelector = true,
    compact = false
}) => {
    const [pageInput, setPageInput] = useState(currentPage.toString());

    // Sync pageInput with currentPage when it changes externally
    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    // Calculate showing range
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Handle page input change
    const handlePageInputChange = (e) => {
        const value = e.target.value;
        // Only allow numbers
        if (value === '' || /^\d+$/.test(value)) {
            setPageInput(value);
        }
    };

    // Handle page input blur or enter - validate and navigate
    const handlePageInputSubmit = () => {
        let pageNum = parseInt(pageInput, 10);

        if (isNaN(pageNum) || pageNum < 1) {
            pageNum = 1;
        } else if (pageNum > totalPages) {
            pageNum = totalPages;
        }

        setPageInput(pageNum.toString());
        if (pageNum !== currentPage && onPageChange) {
            onPageChange(pageNum);
        }
    };

    // Handle key press in page input
    const handlePageInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            handlePageInputSubmit();
            e.target.blur();
        }
    };

    // Handle limit change
    const handleLimitChange = (e) => {
        const newLimit = parseInt(e.target.value, 10);
        if (onLimitChange) {
            onLimitChange(newLimit);
        }
    };

    // Handle previous page
    const handlePrevPage = () => {
        if (currentPage > 1 && onPageChange) {
            onPageChange(currentPage - 1);
        }
    };

    // Handle next page
    const handleNextPage = () => {
        if (currentPage < totalPages && onPageChange) {
            onPageChange(currentPage + 1);
        }
    };

    // Don't render if no items
    if (totalItems === 0 && !showLimitSelector) {
        return null;
    }

    return (
        <div className={`flex items-center justify-between gap-4 ${compact ? 'py-2' : 'px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50'}`}>
            {/* Left side: Limit selector + Record info */}
            <div className="flex items-center gap-3">
                {showLimitSelector && (
                    <select
                        value={itemsPerPage}
                        onChange={handleLimitChange}
                        className="px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
                    >
                        {limitOptions.map((limit) => (
                            <option key={limit} value={limit}>
                                {limit}
                            </option>
                        ))}
                    </select>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {startItem} - {endItem} of {totalItems} Records
                </span>
            </div>

            {/* Right side: Navigation */}
            <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    className={`p-1.5 rounded-md border transition-colors ${currentPage <= 1
                            ? 'border-gray-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                            : 'border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    aria-label="Previous page"
                >
                    <FaChevronLeft size={12} />
                </button>

                {/* Page Input */}
                <input
                    type="text"
                    value={pageInput}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputSubmit}
                    onKeyDown={handlePageInputKeyDown}
                    className="w-12 px-2 py-1.5 text-xs text-center rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                    aria-label="Page number"
                />

                {/* Page info */}
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    of {totalPages}
                </span>

                {/* Next Button */}
                <button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    className={`p-1.5 rounded-md border transition-colors ${currentPage >= totalPages
                            ? 'border-gray-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                            : 'border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    aria-label="Next page"
                >
                    <FaChevronRight size={12} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
