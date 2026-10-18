'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInstitute } from '../../../context/InstituteContext';
import ResourceSettingsModal from '../../../components/ResourceSettingsModal';
import { FileText, Trash2, Calendar, ExternalLink, Search, Plus, PenTool, Upload } from 'lucide-react';
import Link from 'next/link';

export default function ResourcesPage() {
    const { institute } = useInstitute();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const settingsParam = searchParams.get('settings');

    useEffect(() => {
        if (settingsParam === 'open') {
            setIsSettingsOpen(true);
        } else {
            setIsSettingsOpen(false);
        }
    }, [settingsParam]);

    useEffect(() => {
        if (institute?.id) {
            fetchResources();
        }
    }, [institute?.id, category, search]);

    const fetchResources = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                institute_id: institute.id,
                ...(category && { category }),
                ...(search && { search })
            });

            const res = await fetch(`/api/admin/resources?${params}`);
            const data = await res.json();

            if (data.resources) {
                setResources(data.resources);
            }
        } catch (error) {
            console.error('Error fetching resources:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        try {
            const res = await fetch(`/api/admin/resources/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchResources(); // Refresh list
            }
        } catch (error) {
            console.error('Error deleting resource:', error);
        }
    };

    const handleCloseSettings = () => {
        setIsSettingsOpen(false);
        const params = new URLSearchParams(searchParams);
        params.delete('settings');
        router.push(`/admin/resources?${params.toString()}`);
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Free Resources</h1>
                    <p className="text-slate-500 text-sm">Manage syllabus, question papers, and notifications.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/resources/bulk"
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
                    >
                        <Upload size={18} />
                        <span>Bulk Upload</span>
                    </Link>
                    <Link
                        href="/admin/resources/create"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm shadow-blue-200"
                    >
                        <Plus size={18} />
                        <span>Add Resource</span>
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            ) : resources.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No resources found</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        {category
                            ? `No resources found in "${category}" category.`
                            : 'Get started by adding your first resource.'}
                    </p>
                    <Link
                        href="/admin/resources/create"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
                    >
                        <Plus size={16} />
                        <span>Create Resource</span>
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-[40%]">Title</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Sub code</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {resources.map((resource) => (
                                <tr key={resource.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                <FileText size={20} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-0.5 max-w-md truncate">
                                                    {resource.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 max-w-xs truncate">
                                                    {resource.description || 'No description'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`
                                            inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold
                                            ${resource.category === 'Syllabus' ? 'bg-purple-50 text-purple-700' :
                                                resource.category === 'Notification' ? 'bg-orange-50 text-orange-700' :
                                                    'bg-blue-50 text-blue-700'}
                                        `}>
                                            {resource.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                        {resource.metadata?.subject_code || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <a
                                                href={resource.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View Resource"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                            <Link
                                                href={`/admin/resources/edit/${resource.id}`}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Resource"
                                            >
                                                <PenTool size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(resource.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Resource"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ResourceSettingsModal
                isOpen={isSettingsOpen}
                onClose={handleCloseSettings}
            />
        </div>
    );
}
