'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../supabaseClient';
import { useBatches } from '../../../../context/BatchContext';
import { Trash2, Plus, X, Search, Layers, Lock, ShieldCheck, Monitor, AlertCircle, Check, Smartphone, Globe, MonitorCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CourseAccessControlPage = ({ params }) => {
    const router = useRouter();
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    const { batches: allBatches, fetchBatches } = useBatches();

    const [assignedBatches, setAssignedBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(false);

    const [assignedProducts, setAssignedProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');

    const [allowedPlatforms, setAllowedPlatforms] = useState(['web', 'mobile', 'desktop']);
    const [isPublic, setIsPublic] = useState(false);
    const [courseTitle, setCourseTitle] = useState('Loading...');

    useEffect(() => {
        if (id) {
            fetchAssignedBatches();
            fetchCourseSettings();
            if (allBatches.length === 0) fetchBatches();
            fetchProducts();
        }
    }, [id]);

    const fetchCourseSettings = async () => {
        try {
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('title, allowed_products, is_public, platform_availability')
                .eq('id', id)
                .single();

            if (courseError) throw courseError;

            setCourseTitle(courseData.title);
            setIsPublic(courseData?.is_public || false);

            const platformAvailability = courseData?.platform_availability || {};
            const platformsArray = [];
            if (platformAvailability.web !== false) platformsArray.push('web');
            if (platformAvailability.mobile !== false) platformsArray.push('mobile');
            if (platformAvailability.desktop !== false) platformsArray.push('desktop');
            setAllowedPlatforms(platformsArray.length > 0 ? platformsArray : ['web', 'mobile', 'desktop']);

            const productIds = courseData?.allowed_products || [];

            if (productIds.length > 0) {
                const { data: products, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .in('id', productIds);

                if (productsError) throw productsError;
                setAssignedProducts(products || []);
            } else {
                setAssignedProducts([]);
            }
        } catch (error) {
            console.error('Error fetching course settings:', error);
        }
    };

    const fetchAssignedBatches = async () => {
        try {
            const { data, error } = await supabase
                .from('batch_courses')
                .select('batch_id')
                .eq('course_id', id);

            if (error) throw error;

            if (data && data.length > 0) {
                const batchIds = data.map(b => b.batch_id);
                const { data: batchDetails, error: detailsError } = await supabase
                    .from('batches')
                    .select('*')
                    .in('id', batchIds);

                if (detailsError) throw detailsError;
                setAssignedBatches(batchDetails || []);
            } else {
                setAssignedBatches([]);
            }
        } catch (error) {
            console.error('Error fetching assigned batches:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
            if (error) throw error;
            setAllProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const togglePublic = async (newValue) => {
        try {
            const { error } = await supabase.from('courses').update({ is_public: newValue }).eq('id', id);
            if (error) throw error;
            setIsPublic(newValue);
        } catch (error) {
            alert('Failed to update public status: ' + error.message);
        }
    };

    const updateAllowedPlatforms = async (platforms) => {
        try {
            const platformAvailability = {
                web: platforms.includes('web'),
                mobile: platforms.includes('mobile'),
                desktop: platforms.includes('desktop')
            };

            const { error } = await supabase.from('courses').update({ platform_availability: platformAvailability }).eq('id', id);
            if (error) throw error;
            setAllowedPlatforms(platforms);
        } catch (error) {
            alert('Failed to update platform settings: ' + error.message);
        }
    };

    const togglePlatform = (platform) => {
        const newPlatforms = allowedPlatforms.includes(platform)
            ? allowedPlatforms.filter(p => p !== platform)
            : [...allowedPlatforms, platform];
        updateAllowedPlatforms(newPlatforms);
    };

    const handleAddBatches = async () => {
        if (selectedBatches.length === 0) return;
        setProcessing(true);
        try {
            const inserts = selectedBatches.map(batchId => ({ course_id: id, batch_id: batchId }));
            const { error } = await supabase.from('batch_courses').insert(inserts);
            if (error) throw error;
            await fetchAssignedBatches();
            setShowAddModal(false);
            setSelectedBatches([]);
        } catch (error) {
            alert('Failed to add batches: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAddProducts = async () => {
        if (selectedProducts.length === 0) return;
        setProcessing(true);
        try {
            const currentIds = assignedProducts.map(p => p.id);
            const newIds = [...new Set([...currentIds, ...selectedProducts])];
            const { error } = await supabase.from('courses').update({ allowed_products: newIds }).eq('id', id);
            if (error) throw error;
            await fetchCourseSettings();
            setShowProductModal(false);
            setSelectedProducts([]);
        } catch (error) {
            alert('Failed to add products: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveBatch = async (batchId) => {
        if (!confirm('Revoke access for this batch?')) return;
        try {
            const { error } = await supabase.from('batch_courses').delete().eq('course_id', id).eq('batch_id', batchId);
            if (error) throw error;
            setAssignedBatches(prev => prev.filter(b => b.id !== batchId));
        } catch (error) {
            alert('Failed: ' + error.message);
        }
    };

    const handleRemoveProduct = async (productId) => {
        if (!confirm('Revoke access for this product?')) return;
        try {
            const newIds = assignedProducts.filter(p => p.id !== productId).map(p => p.id);
            const { error } = await supabase.from('courses').update({ allowed_products: newIds }).eq('id', id);
            if (error) throw error;
            setAssignedProducts(prev => prev.filter(p => p.id !== productId));
        } catch (error) {
            alert('Failed: ' + error.message);
        }
    };

    const availableBatches = allBatches.filter(b => !assignedBatches.find(ab => ab.id === b.id) && b.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const availableProducts = allProducts.filter(p => !assignedProducts.find(ap => ap.id === p.id) && p.title.toLowerCase().includes(productSearchTerm.toLowerCase()));

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <span onClick={() => router.push('/courses')} className="hover:text-blue-600 cursor-pointer transition-colors">Courses</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-900 font-medium">{courseTitle}</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Lock className="text-blue-600" size={28} /> Access Control
                </h1>
                <p className="text-slate-500 mt-1">Configure who can see and access this course content.</p>
            </div>

            {/* Grid for Top Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Public Access */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <ShieldCheck size={18} className="text-emerald-600" /> Public Visibility
                        </h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isPublic} onChange={(e) => togglePublic(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                    <div className="p-5">
                        <p className="text-sm text-slate-600 leading-relaxed mb-3">
                            {isPublic
                                ? "This course is currently PUBLIC. It is visible to all logged-in students in their library regardless of enrollment."
                                : "This course is PRIVATE. Only students assigned via batches or products can access it."
                            }
                        </p>
                        <div className={`text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-2 ${isPublic ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                            {isPublic ? <Check size={12} /> : <Lock size={12} />}
                            Status: {isPublic ? 'Publicly Accessible' : 'Restricted Access'}
                        </div>
                    </div>
                </div>

                {/* Platforms */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Monitor size={18} className="text-purple-600" /> Platform Availability
                        </h3>
                    </div>
                    <div className="p-5 flex items-center justify-around gap-2">
                        {[
                            { id: 'web', label: 'Web Browser', icon: Globe },
                            { id: 'mobile', label: 'Mobile App', icon: Smartphone },
                            { id: 'desktop', label: 'Desktop App', icon: MonitorCheck }
                        ].map(platform => {
                            const active = allowedPlatforms.includes(platform.id);
                            return (
                                <button
                                    key={platform.id}
                                    onClick={() => togglePlatform(platform.id)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all w-28 text-center
                                        ${active
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <platform.icon size={24} className={active ? 'text-blue-600' : 'text-slate-300'} />
                                    <span className="text-xs font-semibold">{platform.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Assignments Section */}
            <div className="space-y-6">
                {/* Batches */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Layers size={18} className="text-indigo-600" /> Assigned Batches
                            <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{assignedBatches.length}</span>
                        </h3>
                        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors">
                            <Plus size={16} /> Add Batch
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3 text-left">Batch Name</th>
                                    <th className="px-6 py-3 text-left">Institute</th>
                                    <th className="px-6 py-3 text-left">Members</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assignedBatches.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">No batches assigned yet.</td></tr>
                                ) : (
                                    assignedBatches.map(batch => (
                                        <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">{batch.name}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm">{batch.institute_id || 'Global'}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm">{batch.users || 0}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleRemoveBatch(batch.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Products */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Lock size={18} className="text-amber-500" /> Assigned Products
                            <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{assignedProducts.length}</span>
                        </h3>
                        <button onClick={() => setShowProductModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors">
                            <Plus size={16} /> Add Product
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3 text-left">Product Name</th>
                                    <th className="px-6 py-3 text-left">Price</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assignedProducts.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">No products assigned yet.</td></tr>
                                ) : (
                                    assignedProducts.map(product => (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">{product.title}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm">₹{product.price}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${product.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleRemoveProduct(product.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {[
                { show: showAddModal, close: () => setShowAddModal(false), title: "Grant Access to Batches", search: searchTerm, setSearch: setSearchTerm, items: availableBatches, selected: selectedBatches, toggle: (id) => setSelectedBatches(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), submit: handleAddBatches, type: 'batch' },
                { show: showProductModal, close: () => setShowProductModal(false), title: "Link Products", search: productSearchTerm, setSearch: setProductSearchTerm, items: availableProducts, selected: selectedProducts, toggle: (id) => setSelectedProducts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), submit: handleAddProducts, type: 'product' }
            ].map(modal => (
                modal.show && (
                    <div key={modal.title} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900">{modal.title}</h3>
                                <button onClick={modal.close} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder={`Search ${modal.type === 'batch' ? 'batches' : 'products'}...`}
                                        value={modal.search}
                                        onChange={e => modal.setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden h-64 overflow-y-auto bg-slate-50/30 p-2 space-y-1">
                                    {modal.items.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                                            <AlertCircle size={24} className="mb-2 opacity-50" />
                                            No available {modal.type === 'batch' ? 'batches' : 'products'} found.
                                        </div>
                                    ) : (
                                        modal.items.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => modal.toggle(item.id)}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${modal.selected.includes(item.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}
                                            >
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${modal.selected.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                                    {modal.selected.includes(item.id) && <Check size={12} className="text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-900 text-sm truncate">{item.name || item.title}</p>
                                                    <p className="text-xs text-slate-500 truncate">{modal.type === 'batch' ? `${item.institute_id || 'Global'} • ${item.users || 0} Members` : `₹${item.price} • ${item.is_active ? 'Active' : 'Inactive'}`}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
                                <button onClick={modal.close} className="px-4 py-2 text-slate-600 hover:bg-slate-200/50 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                                <button
                                    onClick={modal.submit}
                                    disabled={modal.selected.length === 0 || processing}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10 transition-all"
                                >
                                    {processing ? 'Saving...' : `Add Selected (${modal.selected.length})`}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            ))}
        </div>
    );
};

export default CourseAccessControlPage;
