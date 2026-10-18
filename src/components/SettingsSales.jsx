import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, Calendar, Check, X } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useTransactions } from '../context/TransactionContext';
import { useInstitute } from '../context/InstituteContext';
import { Link } from 'react-router-dom';

const SettingsSales = () => {
    const { products, fetchProducts } = useProducts();
    const { transactions, loading, error, approveOrder, rejectOrder } = useTransactions();
    const { institute } = useInstitute();
    const [showFilters, setShowFilters] = useState(true);

    const orderPrefix = useMemo(() => {
        if (!institute?.name) return '';
        return institute.name.substring(0, 6).toUpperCase();
    }, [institute]);

    useEffect(() => {
        fetchProducts();
    }, []);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [duration, setDuration] = useState('Alldays');
    const [status, setStatus] = useState('completed');
    const [paymentType, setPaymentType] = useState('');
    const [sortBy, setSortBy] = useState('Latest');
    const [perPage, setPerPage] = useState(20);
    const [processingId, setProcessingId] = useState(null);

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const displayId = `${orderPrefix}${t.id}`;
            const matchesSearch = (displayId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (String(t.id)?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (t.user_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (t.product_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (String(t.utr || '')?.toLowerCase()).includes(searchTerm.toLowerCase());
            const matchesProduct = selectedProduct ? t.product_name === selectedProduct : true;
            const matchesStatus = status ? t.status === status : true;

            // Duration Filter (Basic implementation)
            let matchesDuration = true;
            if (duration !== 'Alldays') {
                const date = new Date(t.created_at);
                const now = new Date();
                if (duration === 'Today') {
                    matchesDuration = date.toDateString() === now.toDateString();
                } else if (duration === 'This Week') {
                    const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
                    matchesDuration = date >= oneWeekAgo;
                } else if (duration === 'This Month') {
                    matchesDuration = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }
            }

            return matchesSearch && matchesProduct && matchesStatus && matchesDuration;
        });
    }, [searchTerm, selectedProduct, status, duration, transactions]);

    // Sort Logic
    const sortedTransactions = useMemo(() => {
        return [...filteredTransactions].sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sortBy === 'Latest' ? dateB - dateA : dateA - dateB;
        });
    }, [filteredTransactions, sortBy]);

    // Summary Stats
    const totalTransactions = sortedTransactions.length;
    const totalEarnings = sortedTransactions.reduce((sum, t) => sum + (t.status === 'completed' ? (t.amount || 0) : 0), 0);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    const handleApprove = async (id) => {
        if (window.confirm('Are you sure you want to approve this order?')) {
            setProcessingId(id);
            await approveOrder(id);
            setProcessingId(null);
        }
    };

    const handleReject = async (id) => {
        if (window.confirm('Are you sure you want to reject this order?')) {
            setProcessingId(id);
            await rejectOrder(id);
            setProcessingId(null);
        }
    };

    if (loading && !processingId) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading transactions...</div>;
    if (error) return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>Error loading transactions: {error}</div>;

    return (
        <div className="settings-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '500', color: '#333', margin: 0 }}>Sales Report</h2>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="input-group" style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                        <input
                            type="text"
                            placeholder="Search UTR, Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', padding: '8px 12px', outline: 'none', minWidth: '200px' }}
                        />
                        <button style={{ background: '#f5f5f5', border: 'none', borderLeft: '1px solid #ccc', padding: '8px 12px', cursor: 'pointer' }}>
                            <Search size={16} color="#666" />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
                    >
                        <Filter size={16} /> Filter
                    </button>

                    <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                        <Download size={16} /> Export as Excel
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '4px', border: '1px solid #eee', marginBottom: '30px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '6px' }}>Filter by product</label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none' }}
                        >
                            <option value="">Select Product</option>
                            {products.map(p => (
                                <option key={p.id} value={p.title}>{p.title}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '6px' }}>Filter by duration</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    style={{ width: '100%', padding: '8px 8px 8px 32px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none' }}
                                >
                                    <option value="Alldays">Alldays</option>
                                    <option value="Today">Today</option>
                                    <option value="This Week">This Week</option>
                                    <option value="This Month">This Month</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '6px' }}>Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none' }}
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '6px' }}>Payment Type</label>
                            <input
                                type="text"
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value)}
                                placeholder="---------"
                                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Submit</button>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedProduct('');
                                    setStatus('');
                                    setDuration('Alldays');
                                }}
                                style={{ background: '#f3f4f6', color: '#333', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Clear Filter
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '6px' }}>Sort by</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '120px' }}
                                >
                                    <option value="Latest">Latest</option>
                                    <option value="Oldest">Oldest</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '6px' }}>Per Page</label>
                                <input
                                    type="number"
                                    value={perPage}
                                    onChange={(e) => setPerPage(e.target.value)}
                                    style={{ width: '80px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '40px 0', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', fontWeight: '300', color: '#333', marginBottom: '10px' }}>{totalTransactions}</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL TRANSACTIONS</div>
                </div>
                <div style={{ width: '1px', height: '60px', background: '#eee' }}></div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', fontWeight: '300', color: '#333', marginBottom: '10px' }}>₹ {totalEarnings.toFixed(2)}</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL EARNINGS</div>
                </div>
            </div>

            {/* Data Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee' }}>
                            <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#444' }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#444' }}>Order ID</th>
                            <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#444' }}>Product</th>
                            <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#444' }}>User</th>
                            <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#444' }}>Status</th>
                            <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#444' }}>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTransactions.map((t) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f5', backgroundColor: t.status === 'pending' ? '#fffbeb' : 'transparent' }}>
                                <td style={{ padding: '16px 0', fontSize: '14px', color: '#666' }}>{formatDate(t.created_at)}</td>
                                <td style={{ padding: '16px 0', fontSize: '14px', color: '#3b82f6' }}>{orderPrefix}{t.id}</td>
                                <td style={{ padding: '16px 0', fontSize: '14px', color: '#333' }}>{t.product_name}</td>
                                <td style={{ padding: '16px 0', fontSize: '14px', color: '#3b82f6' }}>
                                    {t.member_id ? (
                                        <Link
                                            to={`/members/${t.member_id}`}
                                            style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}
                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                        >
                                            {t.user_email}
                                        </Link>
                                    ) : (
                                        t.user_email
                                    )}
                                </td>
                                <td style={{ padding: '16px 0', fontSize: '14px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        backgroundColor: t.status === 'completed' ? '#dcfce7' : t.status === 'pending' ? '#fef3c7' : '#fee2e2',
                                        color: t.status === 'completed' ? '#166534' : t.status === 'pending' ? '#92400e' : '#991b1b'
                                    }}>
                                        {t.status}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 0', fontSize: '14px', color: '#333', textAlign: 'right' }}>{(t.amount || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {sortedTransactions.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                        No transactions found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsSales;
