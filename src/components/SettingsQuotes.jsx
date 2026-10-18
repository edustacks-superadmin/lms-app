import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Save, X, Quote, Upload, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { read, utils, writeFile } from 'xlsx';

const SettingsQuotes = () => {
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
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select('*')
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
                    .insert([formData]);
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
                status: 'Active'
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

    if (loading) return <div style={{ padding: '20px' }}>Loading quotes...</div>;

    return (
        <div className="settings-page" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Daily Quotes</h2>
                {!isCreating && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="btn btn-outline"
                            onClick={handleDownloadTemplate}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                        >
                            <Download size={18} /> Template
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv, .xlsx, .xls"
                            style={{ display: 'none' }}
                        />
                        <button
                            className="btn btn-outline"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                        >
                            <Upload size={18} /> Bulk Upload
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsCreating(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}
                        >
                            <Plus size={18} /> Add Quote
                        </button>
                    </div>
                )}
            </div>

            {isCreating ? (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #eee', maxWidth: '800px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{editingId ? 'Edit Quote' : 'Add New Quote'}</h3>
                        <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Quote Text</label>
                            <textarea
                                name="text"
                                value={formData.text}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="e.g. The only way to do great work is to love what you do."
                                rows="3"
                                required
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Author</label>
                            <input
                                type="text"
                                name="author"
                                value={formData.author}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="e.g. Steve Jobs"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="form-control"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={resetForm} className="btn btn-ghost" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}>
                                {editingId ? 'Update Quote' : 'Add Quote'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {quotes.map(quote => (
                        <div key={quote.id} className="card" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <Quote size={24} color="#cbd5e1" />
                                <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: quote.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                                    color: quote.status === 'Active' ? '#166534' : '#374151'
                                }}>
                                    {quote.status}
                                </span>
                            </div>

                            <p style={{ fontSize: '16px', color: '#1e293b', marginBottom: '12px', fontStyle: 'italic', lineHeight: '1.5' }}>
                                "{quote.text}"
                            </p>

                            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', fontWeight: '500' }}>
                                - {quote.author || 'Unknown'}
                            </p>

                            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                                    onClick={() => handleEdit(quote)}
                                >
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}
                                    onClick={() => handleDelete(quote.id)}
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {quotes.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#666' }}>
                            No quotes found. Add one to get started.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsQuotes;
