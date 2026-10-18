'use client';

import React from 'react';
import Link from 'next/link';
import {
    FileText,
    Users,
    HelpCircle,
    MessageSquare,
    Image as ImageIcon,
    Briefcase,
    BookOpen,
    ShoppingCart,
    GraduationCap,
    Globe,
    Shield,
    Layout,
    Settings,
    Megaphone
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import Sidebar from '../../components/Sidebar';
import { useInstitute } from '../../context/InstituteContext';
import { useState, useEffect } from 'react';
import { Plus, X, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const DashboardCard = ({ title, description, icon: Icon, href, color }) => (
    <Link
        href={href}
        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
        <div className={`absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full opacity-10 transition-transform group-hover:scale-110 ${color}`}></div>
        <div className="relative z-10">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${color.replace('bg-', 'bg-opacity-10 text-')} bg-opacity-10`}>
                <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
        </div>
    </Link>
);

export default function AdminDashboard() {
    const { institute, updateInstituteSettings } = useInstitute();
    const { showToast } = useToast();
    const [shortcuts, setShortcuts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newShortcut, setNewShortcut] = useState({ label: '', url: '' });

    useEffect(() => {
        if (institute?.admin_dashboard_config?.shortcuts) {
            setShortcuts(institute.admin_dashboard_config.shortcuts);
        }
    }, [institute]);

    const handleAddShortcut = async () => {
        if (!newShortcut.label || !newShortcut.url) {
            showToast('Please fill all fields', 'error');
            return;
        }

        const updatedShortcuts = [...shortcuts, { ...newShortcut, id: Date.now() }];

        // Optimistic update
        setShortcuts(updatedShortcuts);
        setShowModal(false);
        setNewShortcut({ label: '', url: '' });

        // Save to DB
        const result = await updateInstituteSettings({
            ...institute,
            admin_dashboard_config: {
                ...institute.admin_dashboard_config,
                shortcuts: updatedShortcuts
            }
        });

        if (result.success) {
            showToast('Shortcut added successfully', 'success');
        } else {
            showToast('Failed to save shortcut', 'error');
            // Revert on failure could be added here
        }
    };

    const handleDeleteShortcut = async (id) => {
        const updatedShortcuts = shortcuts.filter(s => s.id !== id);
        setShortcuts(updatedShortcuts);

        const result = await updateInstituteSettings({
            ...institute,
            admin_dashboard_config: {
                ...institute.admin_dashboard_config,
                shortcuts: updatedShortcuts
            }
        });

        if (result.success) {
            showToast('Shortcut removed', 'success');
        }
    };

    const sections = [
        {
            category: "Content Management",
            items: [
                { title: "Pages", desc: "Manage About Us, Terms, Privacy pages", icon: Layout, href: "/admin/pages", color: "bg-blue-600" },
                { title: "Posts", desc: "Blog posts and news updates", icon: FileText, href: "/admin/posts", color: "bg-indigo-600" },
                { title: "Gallery", desc: "Manage images and media", icon: ImageIcon, href: "/admin/gallery", color: "bg-pink-600" },
                { title: "Resources", desc: "Syllabus and study materials", icon: BookOpen, href: "/admin/resources", color: "bg-cyan-600" },
            ]
        },
        {
            category: "Institute & Exams",
            items: [
                { title: "Exam Config", desc: "Configure exams and patterns", icon: Settings, href: "/admin/exam-config", color: "bg-purple-600" },
                { title: "Courses", desc: "Manage courses and subjects", icon: GraduationCap, href: "/courses", color: "bg-emerald-600" },
                { title: "Store", desc: "Manage products and orders", icon: ShoppingCart, href: "/admin/store", color: "bg-orange-600" },
                { title: "FAQs", desc: "Manage frequently asked questions", icon: HelpCircle, href: "/admin/faqs", color: "bg-teal-600" },
            ]
        },
        {
            category: "Community & People",
            items: [
                { title: "Team", desc: "Manage faculty and staff", icon: Users, href: "/admin/team", color: "bg-red-600" },
                { title: "Careers", desc: "Job openings and applications", icon: Briefcase, href: "/admin/careers", color: "bg-rose-600" },
                { title: "Forum", desc: "User discussions and community", icon: MessageSquare, href: "/admin/forum", color: "bg-violet-600" },
                { title: "Roles", desc: "User permissions and access", icon: Shield, href: "/admin/roles", color: "bg-slate-600" },
            ]
        },
        {
            category: "Marketing & System",
            items: [
                { title: "Marketing", desc: "Promotions and campaigns", icon: Megaphone, href: "/admin/marketing/influencers", color: "bg-yellow-600" },
                { title: "Help", desc: "Support and documentation", icon: Globe, href: "/admin/help", color: "bg-blue-500" },
            ]
        }
    ];

    return (
        <AdminLayout>
            <div className="flex min-h-screen bg-slate-50">
                <Sidebar />
                <main className="flex-1 lg:ml-64 p-8">
                    <div className="max-w-[95%] mx-auto space-y-10">
                        {/* Header */}
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl font-extrabold text-slate-900">Admin Dashboard</h1>
                            <p className="text-slate-600">Welcome back! Here's an overview of your management ecosystem.</p>
                        </div>

                        {/* Custom Shortcuts */}
                        <div>
                            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                                <h2 className="text-xl font-bold text-slate-800">Quick Shortcuts</h2>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Plus size={16} /> Manage Shortcuts
                                </button>
                            </div>

                            {shortcuts.length === 0 ? (
                                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
                                    <p className="text-slate-500 mb-2">No shortcuts added yet.</p>
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="text-blue-600 hover:underline text-sm font-medium"
                                    >
                                        Add your frequent pages here
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {shortcuts.map(shortcut => (
                                        <div key={shortcut.id} className="relative group bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleDeleteShortcut(shortcut.id);
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                                            >
                                                <X size={12} />
                                            </button>
                                            <Link href={shortcut.url} className="flex flex-col items-center gap-2 text-center">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100/50 flex items-center justify-center text-blue-600">
                                                    <ExternalLink size={20} />
                                                </div>
                                                <span className="text-sm font-medium text-slate-700 line-clamp-2">{shortcut.label}</span>
                                            </Link>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="border border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                                    >
                                        <Plus size={24} />
                                        <span className="text-xs font-medium">Add New</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Add Shortcut Modal */}
                        {showModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-slate-800">Add New Shortcut</h3>
                                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Label</label>
                                            <input
                                                type="text"
                                                value={newShortcut.label}
                                                onChange={(e) => setNewShortcut(prev => ({ ...prev, label: e.target.value }))}
                                                placeholder="e.g. Google Analytics"
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Destination URL</label>
                                            <input
                                                type="text"
                                                value={newShortcut.url}
                                                onChange={(e) => setNewShortcut(prev => ({ ...prev, url: e.target.value }))}
                                                placeholder="/admin/custom-page or https://..."
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddShortcut}
                                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                        >
                                            Add Shortcut
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dashboard Grid */}
                        <div className="space-y-10">
                            {sections.map((section, idx) => (
                                <div key={idx}>
                                    <h2 className="mb-4 text-xl font-bold text-slate-800 border-b border-slate-200 pb-2">
                                        {section.category}
                                    </h2>
                                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                        {section.items.map((item, itemIdx) => (
                                            <DashboardCard
                                                key={itemIdx}
                                                {...item}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </AdminLayout>
    );
}
