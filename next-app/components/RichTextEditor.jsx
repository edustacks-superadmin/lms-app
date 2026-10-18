import dynamic from 'next/dynamic';
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import 'react-quill-new/dist/quill.snow.css';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { FileText, Code, Eye } from 'lucide-react';

// Make katex available globally for Quill
if (typeof window !== 'undefined') {
    window.katex = katex;
}

// Dynamic import for ReactQuill and Quill registration
const ReactQuill = dynamic(async () => {
    const { default: RQ } = await import('react-quill-new');

    // Customize Quill to allow more HTML tags and attributes
    if (RQ && RQ.Quill) {
        const Quill = RQ.Quill;
        // Register structural tags as blocks
        const Block = Quill.import('blots/block');
        const Inline = Quill.import('blots/inline');

        const tags = ['div', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'main', 'figure', 'figcaption'];
        tags.forEach(tag => {
            class CustomBlock extends Block { }
            CustomBlock.blotName = tag;
            CustomBlock.tagName = tag;
            Quill.register(CustomBlock, true);
        });

        const inlineTags = ['span', 'i', 'mark'];
        inlineTags.forEach(tag => {
            class CustomInline extends Inline { }
            CustomInline.blotName = tag;
            CustomInline.tagName = tag;
            Quill.register(CustomInline, true);
        });
    }

    return ({ forwardedRef, ...props }) => <RQ ref={forwardedRef} {...props} />;
}, {
    ssr: false,
    loading: () => <div className="h-24 w-full bg-gray-50 animate-pulse rounded-md" />
});

// --- Math Modal Component ---
const MathModal = ({ isOpen, onClose, onSave, initialValue }) => {
    const [latex, setLatex] = useState(initialValue || '');
    const previewRef = useRef(null);

    useEffect(() => {
        setLatex(initialValue || '');
    }, [initialValue, isOpen]);

    useEffect(() => {
        if (previewRef.current) {
            try {
                katex.render(latex, previewRef.current, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                previewRef.current.innerHTML = '<span style="color:red">Invalid LaTeX</span>';
            }
        }
    }, [latex, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg w-[500px] max-w-[90%] shadow-xl">
                <h3 className="m-0 mb-4 text-lg font-semibold">Mathematics in TeX</h3>

                <h4 className="text-sm mb-2 text-gray-600">Write your TeX here</h4>
                <textarea
                    value={latex}
                    onChange={(e) => setLatex(e.target.value)}
                    rows={4}
                    className="w-full p-2.5 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                />

                <div className="mt-4 min-h-[60px] p-2.5 bg-gray-50 rounded text-center">
                    <div ref={previewRef} />
                </div>

                <div className="flex justify-end gap-2.5 mt-5">
                    <button
                        onClick={onClose}
                        type="button"
                        className="py-2 px-4 border border-gray-300 bg-white rounded cursor-pointer hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(latex)}
                        type="button"
                        className="py-2 px-4 border-none bg-green-700 text-white rounded font-medium cursor-pointer hover:bg-green-800"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

const TOOLBAR_CONFIG = [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': [] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }],
    [{ 'align': [] }],
    ['link', 'image', 'video', 'formula'],
    ['clean']
];

const RichTextEditor = ({ value, onChange, placeholder }) => {
    const [viewMode, setViewMode] = useState('visual');
    const quillRef = useRef(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentLatex, setCurrentLatex] = useState('');
    const [editRange, setEditRange] = useState(null);

    const saveFormula = (latex) => {
        const quill = quillRef.current?.getEditor();
        if (!quill || !editRange) return;

        if (editRange.length > 0) {
            quill.deleteText(editRange.index, editRange.length);
        }

        quill.insertEmbed(editRange.index, 'formula', latex);
        quill.setSelection(editRange.index + 1);
        setModalOpen(false);
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: TOOLBAR_CONFIG,
        },
        clipboard: {
            matchVisual: false
        }
    }), []);

    // Formula & Toolbar Handler Logic
    useEffect(() => {
        let root = null;
        let handler = null;

        const timer = setTimeout(() => {
            const quill = quillRef.current?.getEditor();
            if (!quill) return;

            // 1. Attach Formula Handler
            const toolbar = quill.getModule('toolbar');
            if (toolbar && !toolbar._formulaHandlerAttached) {
                toolbar.addHandler('formula', () => {
                    const range = quill.getSelection(true);
                    setCurrentLatex('');
                    setEditRange(range);
                    setModalOpen(true);
                });
                toolbar._formulaHandlerAttached = true;
            }

            // 2. Click Listener for Formulas
            handler = (e) => {
                const formulaNode = e.target.closest('.ql-formula');
                if (formulaNode) {
                    e.preventDefault();
                    e.stopPropagation();

                    const latex = formulaNode.getAttribute('data-value');
                    const blot = quill.scroll.find(formulaNode);
                    if (blot) {
                        const index = quill.getIndex(blot);
                        setCurrentLatex(latex || '');
                        setEditRange({ index: index, length: 1 });
                        setModalOpen(true);
                    }
                }
            };

            root = quill.root;
            root.addEventListener('click', handler);
        }, 800);

        return () => {
            clearTimeout(timer);
            if (root && handler) {
                root.removeEventListener('click', handler);
            }
        };
    }, []);

    return (
        <div className="h-auto flex flex-col rich-text-editor-wrapper border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Mode Toggle Header */}
            <div className="bg-slate-50 border-b border-gray-200 px-3 py-1.5 flex justify-between items-center gap-2">
                <div className="flex bg-slate-200/50 p-1 rounded-lg gap-1">
                    {[
                        { id: 'visual', label: 'Visual', icon: <Eye size={14} /> },
                        { id: 'source', label: 'HTML Source', icon: <Code size={14} /> },
                        { id: 'preview', label: 'Live Preview', icon: <FileText size={14} /> }
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            type="button"
                            onClick={() => setViewMode(mode.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all
                                ${viewMode === mode.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/80'}
                            `}
                        >
                            {mode.icon}
                            <span>{mode.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="editor-content-area flex-1 flex flex-col min-h-[500px] bg-white">
                {/* Visual Editor */}
                {viewMode === 'visual' && (
                    <div className="quill-container-wrapper flex-1 flex flex-col animate-in fade-in duration-300">
                        <ReactQuill
                            forwardedRef={quillRef}
                            theme="snow"
                            value={value || ''}
                            onChange={onChange}
                            modules={modules}
                            placeholder={placeholder}
                        />
                    </div>
                )}

                {/* Source Mode */}
                {viewMode === 'source' && (
                    <div className="source-editor-wrapper h-[500px] animate-in fade-in duration-300">
                        <textarea
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full h-full p-6 font-mono text-[13px] leading-relaxed focus:outline-none bg-slate-900 text-blue-100 selection:bg-blue-500/30 border-none resize-none"
                            placeholder="Write or paste your custom HTML here..."
                            spellCheck={false}
                        />
                    </div>
                )}

                {/* Preview Mode */}
                {viewMode === 'preview' && (
                    <div className="preview-mode-wrapper p-8 bg-white overflow-auto animate-in slide-in-from-bottom-2 duration-300 h-[500px]">
                        <div
                            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600"
                            dangerouslySetInnerHTML={{ __html: value || '<p class="text-slate-400 italic">No content to preview</p>' }}
                        />
                    </div>
                )}
            </div>

            <MathModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={saveFormula}
                initialValue={currentLatex}
            />

            <style jsx global>{`
                .rich-text-editor-wrapper .quill {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .rich-text-editor-wrapper .ql-toolbar.ql-snow {
                    border: none;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                    padding: 8px;
                }
                .rich-text-editor-wrapper .ql-container.ql-snow {
                    border: none;
                    flex: 1;
                    min-height: 400px;
                    font-size: 16px;
                }
                .rich-text-editor-wrapper .ql-editor {
                    min-height: 400px;
                }
                .ql-formula {
                    cursor: pointer;
                    background: #f1f5f9;
                    border-radius: 4px;
                    padding: 2px 4px;
                    transition: background-color 0.2s;
                }
                .ql-formula:hover {
                    background-color: #e2e8f0;
                }
                /* Prevent selecting inside the formula */
                .ql-formula * {
                    user-select: none !important;
                    pointer-events: none;
                }

                .source-editor-wrapper textarea {
                    scrollbar-width: thin;
                    scrollbar-color: #475569 #0f172a;
                }
                .source-editor-wrapper textarea::-webkit-scrollbar {
                    width: 8px;
                }
                .source-editor-wrapper textarea::-webkit-scrollbar-track {
                    background: #0f172a;
                }
                .source-editor-wrapper textarea::-webkit-scrollbar-thumb {
                    background-color: #475569;
                    border-radius: 20px;
                    border: 2px solid #0f172a;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
