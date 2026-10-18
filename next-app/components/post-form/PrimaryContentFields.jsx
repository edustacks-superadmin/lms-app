import React from 'react';

const PrimaryContentFields = ({ formData, onChange, onContentChange, showHtml, setShowHtml, isUploading, onFileChange, ReactQuill }) => {
    return (
        <div className="space-y-6">
            {/* Title */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                    <label className="text-sm font-semibold text-gray-700">Title</label>
                    <span className={`text-xs font-bold ${formData.title.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                        {formData.title.length}/60
                    </span>
                </div>
                <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={onChange}
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition-all placeholder-gray-400
                        ${formData.title.length > 60
                            ? 'border-red-200 focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500'}`}
                    placeholder="Enter post title"
                    required
                />
                {formData.title.length > 60 && (
                    <p className="text-xs text-red-500 mt-1">
                        ⚠️ Title is too long and may be cut off in search results.
                    </p>
                )}
            </div>

            {/* Cover Image */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Cover Image</label>
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center transition-colors hover:border-emerald-300">
                    <input
                        type="file"
                        onChange={onFileChange}
                        accept="image/*"
                        className="mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    <p className="text-xs text-gray-400">
                        Recommended: 1920x1080. Max size: 2MB.
                    </p>
                    {isUploading && <p className="mt-2 text-sm text-emerald-600 animate-pulse">Uploading...</p>}
                    {formData.coverImage && (
                        <div className="mt-4 relative group">
                            <img
                                src={formData.coverImage}
                                alt="Cover"
                                className="max-h-52 rounded-lg shadow-sm border border-gray-100"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                <span className="text-white text-xs font-medium">New image replaces this</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                    <label className="text-sm font-semibold text-gray-700">Summary</label>
                    <span className={`text-xs font-bold ${formData.summary.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                        {formData.summary.length}/160
                    </span>
                </div>
                <textarea
                    name="summary"
                    value={formData.summary}
                    onChange={onChange}
                    rows={3}
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition-all placeholder-gray-400 resize-none
                        ${formData.summary.length > 160
                            ? 'border-red-200 focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500'}`}
                    placeholder="Enter a brief summary..."
                />
                {formData.summary.length > 160 && (
                    <p className="text-xs text-red-500 mt-1">
                        ⚠️ Summary exceeds 160 characters and will be truncated on Google.
                    </p>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">Content</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const cleaned = (formData.content || '').replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ');
                                onContentChange(cleaned);
                            }}
                            className="text-xs font-medium px-3 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100"
                        >
                            Clean Formatting
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const willShowVisual = showHtml; // Switching TO Visual
                                if (willShowVisual) {
                                    try {
                                        const parser = new DOMParser();
                                        const doc = parser.parseFromString(formData.content || '', 'text/html');
                                        const tables = doc.querySelectorAll('table');

                                        tables.forEach(table => {
                                            // 1. Convert TH to TD
                                            const ths = table.querySelectorAll('th');
                                            ths.forEach(th => {
                                                const td = doc.createElement('td');
                                                td.innerHTML = th.innerHTML;
                                                td.style.fontWeight = 'bold';
                                                // Copy attributes if needed
                                                Array.from(th.attributes).forEach(attr => {
                                                    td.setAttribute(attr.name, attr.value);
                                                });
                                                th.parentNode.replaceChild(td, th);
                                            });

                                            // 2. Unwrap THEAD
                                            const theads = table.querySelectorAll('thead');
                                            theads.forEach(thead => {
                                                const rows = Array.from(thead.querySelectorAll('tr'));
                                                rows.reverse().forEach(tr => {
                                                    thead.parentNode.insertBefore(tr, thead.nextSibling); // insert after head (top of body usually)
                                                });
                                                thead.remove();
                                            });

                                            // 3. Fix Footer (Consolidated Total) specifically for 3-col tables
                                            const rows = table.querySelectorAll('tr');
                                            if (rows.length > 0) {
                                                const lastRow = rows[rows.length - 1];
                                                const cells = lastRow.querySelectorAll('td');

                                                if (cells.length === 3) {
                                                    const firstText = cells[0].textContent.toLowerCase();
                                                    const secondText = cells[1].textContent.trim();
                                                    const thirdText = cells[2].textContent.trim();

                                                    // Detect if it looks like "Total ... [Value] [Empty]" pattern
                                                    if (firstText.includes('total') && secondText && !thirdText) {
                                                        // Move Value to Col 3
                                                        cells[2].innerHTML = cells[1].innerHTML;
                                                        cells[1].innerHTML = '&nbsp;'; // Keep it existing but empty

                                                        // Simulate Merge
                                                        cells[0].style.borderRight = 'none';
                                                        cells[1].style.borderLeft = 'none';

                                                        // Ensure alignment
                                                        cells[0].style.textAlign = 'right';
                                                        cells[0].style.fontWeight = 'bold';
                                                        cells[2].style.fontWeight = 'bold';
                                                    }
                                                }
                                            }
                                        });

                                        onContentChange(doc.body.innerHTML);
                                    } catch (e) {
                                        console.error("Table normalization failed", e);
                                    }
                                }
                                setShowHtml(!showHtml);
                            }}
                            className="text-xs font-medium px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            {showHtml ? 'Visual Editor' : 'HTML Source'}
                        </button>
                    </div>
                </div>

                <div className="min-h-[300px] rounded-lg border border-gray-200 overflow-hidden">
                    {showHtml ? (
                        <textarea
                            value={formData.content}
                            onChange={(e) => onContentChange(e.target.value)}
                            className="w-full h-[300px] p-4 font-mono text-sm outline-none resize-none"
                        />
                    ) : (
                        <div className="h-[300px]">
                            <ReactQuill
                                theme="snow"
                                value={formData.content}
                                onChange={onContentChange}
                                className="h-[258px]"
                                modules={{
                                    toolbar: [
                                        [{ 'header': [1, 2, false] }],
                                        ['bold', 'italic', 'underline', 'strike'],
                                        ['blockquote', 'code-block'],
                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                        ['link', 'image'],
                                        ['clean']
                                    ],
                                    table: true
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrimaryContentFields;
