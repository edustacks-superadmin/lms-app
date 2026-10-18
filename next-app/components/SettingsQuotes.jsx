import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Save, X, Quote, Upload, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { read, utils, writeFile } from 'xlsx';
import { useInstitute } from '../context/InstituteContext';

const SettingsQuotes = () => {
    const { institute } = useInstitute();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        text: '',
        author: '',
        status: 'Active'
    });

    useEffect(() => {
        if (institute?.id) {
            fetchQuotes();
        }
    }, [institute?.id]);

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select('*')
                .eq('institute_id', institute?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setQuotes(data || []);
        } catch (error) {
            console.error('Error fetching quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('quotes')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('quotes')
                    .insert([{ ...formData, institute_id: institute?.id }]);
                if (error) throw error;
            }

            await fetchQuotes();
            resetForm();
        } catch (error) {
            console.error('Error saving quote:', error);
            alert('Error saving quote: ' + error.message);
        }
    };

    const handleEdit = (quote) => {
        setFormData({
            text: quote.text,
            author: quote.author,
            status: quote.status
        });
        setEditingId(quote.id);
        setIsCreating(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this quote?')) return;

        try {
            const { error } = await supabase
                .from('quotes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setQuotes(prev => prev.filter(q => q.id !== id));
        } catch (error) {
            console.error('Error deleting quote:', error);
            alert('Error deleting quote: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({ text: '', author: '', status: 'Active' });
        setEditingId(null);
        setIsCreating(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                alert('No data found in file');
                return;
            }

            // Validate and format data
            const formattedData = jsonData.map(row => ({
                text: row.text || row.Text || row.Quote || row.quote,
                author: row.author || row.Author || 'Unknown',
                status: 'Active',
                institute_id: institute?.id
            })).filter(item => item.text); // Ensure text exists

            if (formattedData.length === 0) {
                alert('No valid quotes found. Please ensure columns are named "text" and "author".');
                return;
            }

            const { error } = await supabase
                .from('quotes')
                .insert(formattedData);

            if (error) throw error;

            alert(`Successfully uploaded ${formattedData.length} quotes!`);
            fetchQuotes();
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file: ' + error.message);
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
        ];
        const ws = utils.json_to_sheet(templateData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Template");
        writeFile(wb, "quotes_template.xlsx");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading quotes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Daily Quotes</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage inspiring quotes displayed to your students</p>
                </div>
                {!isCreating && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm shadow-sm"
                        >
                            <Download size={16} /> Template
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv, .xlsx, .xls"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm shadow-sm"
                        >
                            <Upload size={16} /> Bulk Upload
                        </button>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
                        >
                            <Plus size={18} /> Add Quote
                        </button>
                    </div>
                )}
            </div>

            {isCreating ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-2xl mx-auto animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800">
                            {editingId ? 'Edit Quote' : 'Add New Quote'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Quote Text</label>
                            <textarea
                                name="text"
                                value={formData.text}
                                onChange={handleInputChange}
                                placeholder="e.g. The only way to do great work is to love what you do."
                                rows="3"
                                required
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors resize-y"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Author</label>
                            <input
                                type="text"
                                name="author"
                                value={formData.author}
                                onChange={handleInputChange}
                                placeholder="e.g. Steve Jobs"
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 cursor-pointer transition-colors"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
                            >
                                {editingId ? 'Update Quote' : 'Add Quote'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                    {quotes.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                                <Quote size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No quotes found</h3>
                            <p className="text-slate-500 mt-1 max-w-sm mx-auto mb-6">Add inspiring quotes to motivate your students.</p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={18} /> Add Quote
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {quotes.map(quote => (
                                <div key={quote.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <Quote size={24} className="text-blue-200 fill-blue-50" />
                                        <span className={`
                                            px-2.5 py-1 rounded-full text-xs font-medium border
                                            ${quote.status === 'Active'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : 'bg-slate-50 text-slate-600 border-slate-200'}
                                        `}>
                                            {quote.status}
                                        </span>
                                    </div>

                                    <div className="flex-1 mb-6">
                                        <p className="text-slate-800 text-lg font-medium italic leading-relaxed mb-2">
                                            "{quote.text}"
                                        </p>
                                        <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                                            <span className="w-4 h-[1px] bg-slate-300"></span>
                                            {quote.author || 'Unknown'}
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t border-slate-50 mt-auto">
                                        <button
                                            onClick={() => handleEdit(quote)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                                        >
                                            <Edit2 size={16} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(quote.id)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                                        >
                                            <Trash2 size={16} /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SettingsQuotes;
