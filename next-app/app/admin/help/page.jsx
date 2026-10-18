'use client';

import React, { useState } from 'react';
import {
    BookOpen, HelpCircle, Users, Layers, ShieldCheck,
    Smartphone, Video, PlayCircle, FileText, ChevronDown,
    ChevronUp, ExternalLink, Mail, Tag, FileQuestion, Folder,
    Settings, DollarSign, PenTool, TrendingUp, LayoutGrid,
    Sparkles, Send, Bot
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';

const TipBox = ({ title, children, type = "tip" }) => {
    const styles = {
        tip: { bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-900", icon: "text-indigo-600", symbol: Sparkles },
        warning: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-900", icon: "text-amber-600", symbol: HelpCircle },
        alert: { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-900", icon: "text-rose-600", symbol: ShieldCheck }
    };
    const s = styles[type] || styles.tip;
    const Icon = s.symbol;

    return (
        <div className={`${s.bg} p-4 rounded-xl border ${s.border} my-4`}>
            <h4 className={`font-bold ${s.text} mb-2 flex items-center gap-2 text-sm`}>
                <Icon size={16} className={s.icon} /> {title}
            </h4>
            <div className={`text-sm ${s.text} opacity-90 space-y-1`}>
                {children}
            </div>
        </div>
    );
};

const Section = ({ title, icon: Icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4 group transition-all hover:border-indigo-200">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors text-left"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                        <Icon size={20} />
                    </div>
                    <span className={`font-bold text-base ${isOpen ? 'text-indigo-900' : 'text-slate-700'}`}>{title}</span>
                </div>
                {isOpen ? <ChevronUp size={20} className="text-indigo-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </button>
            {isOpen && (
                <div className="p-6 pt-0 text-slate-600 leading-relaxed space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <hr className="border-slate-100 mb-4" />
                    {children}
                </div>
            )}
        </div>
    );
};



const getTextFromJsx = (node) => {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(getTextFromJsx).join(' ');
    if (node.props && node.props.children) return getTextFromJsx(node.props.children);
    return '';
};

// --- New AI Chat Interface ---
const AiChatInterface = ({ categories }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Hi! I'm your Admin Assistant. Ask me anything about managing your academy (e.g., 'How do I add students?' or 'What is a batch?')." }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate AI thinking and finding answer
        setTimeout(() => {
            const answer = findAnswer(userMsg.text, categories);
            setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
            setIsTyping(false);
        }, 1000);
    };

    // Simple keyword matching logic (Simulating RAG)
    const findAnswer = (query, info) => {
        const q = query.toLowerCase().trim();

        // 1. Handle Greetings & Basic Interaction
        if (['hi', 'hello', 'hey', 'greetings'].includes(q)) {
            return "Hello! 👋 I'm your Admin Assistant. Ask me anything about managing your academy (e.g., 'How to add a student' or 'Create an exam').";
        }
        if (q === 'help') {
            return "I can help you navigate the admin panel. Try asking: 'How do I create a course?' or 'How to track sales?'.";
        }

        let bestMatch = null;
        let maxScore = 0;

        // Flatten all content
        const allTopics = info.flatMap(cat => cat.topics || []);

        allTopics.forEach(topic => {
            let score = 0;
            const contentStr = getTextFromJsx(topic.content).toLowerCase();
            const titleStr = topic.title.toLowerCase();

            // Simple scoring
            if (titleStr.includes(q)) score += 10;
            if (contentStr.includes(q)) score += 5;

            // Check for keywords
            const keywords = q.split(' ');
            keywords.forEach(k => {
                if (k.length > 3) {
                    if (titleStr.includes(k)) score += 3;
                    if (contentStr.includes(k)) score += 1;
                }
            });

            if (score > maxScore) {
                maxScore = score;
                bestMatch = topic;
            }
        });

        if (maxScore > 0 && bestMatch) {
            return (
                <div className="space-y-2">
                    <p>Here is what I found regarding <strong>"{bestMatch.title}"</strong>:</p>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-slate-700">
                        {bestMatch.content}
                    </div>
                </div>
            );
        } else {
            return "I'm not sure about that yet. Try searching for keywords like 'Course', 'Student', or 'Exam'.";
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[600px] flex flex-col">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
                                {msg.role === 'user' ? <Users size={16} className="text-indigo-600" /> : <Bot size={16} className="text-emerald-600" />}
                            </div>

                            {/* Bubble */}
                            <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-slate-100 text-slate-800 rounded-tl-none'
                                }`}>
                                {typeof msg.text === 'string' ? msg.text : msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="flex gap-3 max-w-[80%]">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <Bot size={16} className="text-emerald-600" />
                            </div>
                            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-slate-500 text-xs italic">
                                Thinking...
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="bg-indigo-600 text-white p-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

const HelpCenterPage = () => {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('AI Assistant'); // Default to AI for "wow" factor



    const helpCategories = [
        {
            id: 'AI Assistant',
            icon: Sparkles,
            desc: "Get instant answers",
            color: "text-amber-500",
            bg: "bg-amber-50",
            topics: [] // Logic handled separately
        },
        {
            id: 'Essentials',
            icon: BookOpen,
            desc: "Dashboard & Navigation",
            color: "text-blue-500",
            bg: "bg-blue-50",
            topics: [
                {
                    title: "Admin Panel Site Map",
                    icon: LayoutGrid,
                    content: (
                        <div className="space-y-4">
                            <p>Overview of the main sections in your admin panel.</p>
                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                                {[
                                    { t: "Dashboard", d: "Sales, Students, App usage stats", i: "📊" },
                                    { t: "Courses", d: "Video contents, PDFs, Test Series", i: "📚" },
                                    { t: "Members", d: "Student management & blocking", i: "👥" },
                                    { t: "Batches", d: "Offline groups & internal cohorts", i: "📂" },
                                    { t: "Exams", d: "Create tests for courses", i: "✍️" },
                                    { t: "Store", d: "Products, Pricing, Coupons", i: "🛍️" },
                                    { t: "Posts", d: "News & Announcements", i: "📰" },
                                    { t: "Settings", d: "App config, Integrations", i: "⚙️" },
                                ].map((item, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                                        <strong className="block text-slate-900 mb-1">{item.i} {item.t}</strong>
                                        <span className="text-slate-500 text-xs">{item.d}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                },
                {
                    title: "Products vs. Batches",
                    icon: Layers,
                    content: (
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-2">📦 What is a Product?</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        <li>Think of a Product as something you <strong>sell</strong> (e.g., "Gold Plan").</li>
                                        <li>A single Product can unlock <strong>multiple courses</strong>.</li>
                                        <li><strong>Use Case:</strong> Selling a yearly subscription.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-2">👥 What is a Batch?</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        <li>Think of a Batch as a <strong>classroom</strong> (e.g., "Class 10 A").</li>
                                        <li>Used for internal management or offline students.</li>
                                        <li><strong>Use Case:</strong> Granting free access to a specific group.</li>
                                    </ul>
                                </div>
                            </div>
                            <TipBox title="Best Practice">
                                Create a <strong>Product</strong> for everything you want to sell online. Use <strong>Batches</strong> only for manual student grouping.
                            </TipBox>
                        </div>
                    )
                }
            ]
        },
        {
            id: 'Courses & Media',
            icon: Video,
            desc: "Videos, PDFs & Hosting",
            color: "text-rose-500",
            bg: "bg-rose-50",
            topics: [
                {
                    title: "Video Hosting Options",
                    icon: Video,
                    content: (
                        <div className="space-y-4">
                            <p>You can host your course videos in three ways:</p>
                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                <li><strong>Cloudflare R2 (Recommended):</strong> Secure, fast, and no-ads. Videos are encrypted to prevent downloading. Ideal for paid courses.</li>
                                <li><strong>YouTube:</strong> Free but less secure. Ads may appear. Good for free/demo content.</li>
                                <li><strong>Vimeo/Link:</strong> Direct MP4 links from other providers.</li>
                            </ul>
                            <TipBox title="Security Note" type="alert">
                                <strong>R2 Hosting</strong> provides DRM protection. Screen recording is blocked on the Mobile App for R2 videos, keeping your content safe.
                            </TipBox>
                        </div>
                    )
                },
                {
                    title: "Managing Content",
                    icon: Folder,
                    content: (
                        <div>
                            <p className="mb-2">Organize content hierarchically:</p>
                            <ol className="list-decimal pl-5 space-y-1 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <li>Create a <strong>Course</strong>.</li>
                                <li>Add <strong>Chapters</strong> (e.g., "Physics", "Maths").</li>
                                <li>Inside Chapters, add <strong>Materials</strong> (Videos, PDFs, Exams).</li>
                            </ol>
                        </div>
                    )
                }
            ]
        },
        {
            id: 'Sales & Payments',
            icon: DollarSign,
            desc: "Revenue, Orders & Refunds",
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            topics: [
                {
                    title: "Payment Gateway",
                    icon: DollarSign,
                    content: (
                        <div className="space-y-4">
                            <p>We integrate with <strong>Razorpay</strong> for seamless payments.</p>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                <li>Enable keys in <em>Settings &gt; Integrations</em>.</li>
                                <li>Funds settle directly to your bank account (T+2 days usually).</li>
                            </ul>
                            <TipBox title="Refund Policy" type="warning">
                                Refunds must be initiated from your <strong>Razorpay Dashboard</strong>, not from this admin panel. The app will automatically update the status once webhook triggers.
                            </TipBox>
                        </div>
                    )
                },
                {
                    title: "Coupons & Discounts",
                    icon: Tag,
                    content: (
                        <div>
                            <p>Go to <strong>Store &gt; Coupons</strong> to create codes.</p>
                            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                                <div className="p-2 border rounded">
                                    <strong>Flat Discount:</strong> ₹500 OFF
                                </div>
                                <div className="p-2 border rounded">
                                    <strong>Percentage:</strong> 20% OFF (up to ₹1000)
                                </div>
                            </div>
                        </div>
                    )
                }
            ]
        },
        {
            id: 'Students',
            icon: Users,
            desc: "Management & Bulk Actions",
            color: "text-violet-500",
            bg: "bg-violet-50",
            topics: [
                {
                    title: "Bulk Import Students",
                    icon: Users,
                    content: (
                        <div className="space-y-4">
                            <p>Add hundreds of students at once using CSV.</p>
                            <ol className="list-decimal pl-5 space-y-2 text-sm">
                                <li>Go to <strong>Members &gt; Import</strong>.</li>
                                <li>Download the <strong>Sample CSV</strong>.</li>
                                <li>Fill data carefully. <strong>Do NOT change header names.</strong></li>
                                <li>Upload. Passwords will be auto-generated (usually mobile number).</li>
                            </ol>
                            <TipBox title="Common Error" type="alert">
                                Ensure phone numbers do not have country codes (e.g., use 9876543210, not +919876...).
                            </TipBox>
                        </div>
                    )
                },
                {
                    title: "Blocking & Deleting",
                    icon: ShieldCheck,
                    content: (
                        <div className="space-y-2">
                            <p>Click the <strong>⋮ Menu</strong> next to any student.</p>
                            <ul className="list-disc pl-5 text-sm">
                                <li><strong>Block:</strong> Prevents login but keeps data.</li>
                                <li><strong>Delete:</strong> Permanently wipes exam history. Use carefully.</li>
                            </ul>
                        </div>
                    )
                }
            ]
        },
        {
            id: 'Settings & Privacy',
            icon: Settings,
            desc: "App Config & Security",
            color: "text-slate-500",
            bg: "bg-slate-50",
            topics: [
                {
                    title: "Security Features",
                    icon: ShieldCheck,
                    content: (
                        <div className="space-y-4">
                            <p>Your app comes with enterprise-grade security:</p>
                            <div className="grid gap-2 text-sm">
                                <div className="bg-green-50 p-2 rounded text-green-800">✅ <strong>Screenshot Block:</strong> Active on mobile app for all paid content.</div>
                                <div className="bg-green-50 p-2 rounded text-green-800">✅ <strong>Device Lock:</strong> Single device login enforcement.</div>
                                <div className="bg-green-50 p-2 rounded text-green-800">✅ <strong>DRM:</strong> Encrypted video streaming.</div>
                            </div>
                        </div>
                    )
                },
                {
                    title: "Mobile App Banners",
                    icon: Smartphone,
                    content: (
                        <p>Go to <strong>Settings &gt; App</strong> to upload sliding banners for the home screen. Recommended size: <strong>16:9 ratio</strong>.</p>
                    )
                }
            ]
        }
    ];

    const faqs = [
        { q: "How do I delete a student?", a: "Go to Members, find the student, click the menu icon (⋮), and select Delete. This action is permanent." },
        { q: "Why isn't my course showing?", a: "Check if the course is marked as Private. Also, ensure the user has the correct Product or Batch assigned." },
        { q: "Can I sell courses individually?", a: "Yes! Create a unique Product for that single course and link it in the course's Access Control settings." },
        { q: "Video upload failed?", a: "Ensure your internet is stable. For large files (>1GB), we recommend using Handbrake to compress them before uploading." }
    ];

    // Filter Logic
    const term = search.toLowerCase();
    const isSearching = term.length > 0;

    // Helper to check if text matches
    const matches = (text) => text && text.toLowerCase().includes(term);
    const matchesContent = (content) => {
        if (!content) return false;
        try {
            return getTextFromJsx(content).toLowerCase().includes(term);
        } catch (e) {
            return false;
        }
    }

    // If searching, we flatten all topics and filter them
    // If not searching, we show topics from the active category
    const displayedTopics = isSearching
        ? helpCategories.flatMap(cat => cat.topics).filter(t => matches(t.title) || matchesContent(t.content))
        : helpCategories.find(c => c.id === activeCategory)?.topics || [];


    const filteredFaqs = faqs.filter(f => matches(f.q) || matches(f.a));

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                {/* Modern Hero Section */}
                <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white pb-24 pt-10 px-4">
                    <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-extrabold tracking-tight">How can we help you?</h1>
                            <p className="text-indigo-100 text-lg">Search our knowledge base or ask the AI Assistant</p>
                        </div>
                        <div className="relative w-full max-w-2xl">
                            <input
                                type="text"
                                placeholder="E.g., 'How to create a course' or 'Add student'"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-md text-white placeholder:text-indigo-200 focus:outline-none focus:ring-4 focus:ring-white/20 shadow-xl border border-white/10 text-lg transition-all"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200">
                                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 -mt-12 pb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* Left Sidebar - Categories */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Category Cards */}
                            <div className="grid gap-2">
                                {helpCategories.map((cat) => {
                                    const Icon = cat.icon;
                                    const isActive = activeCategory === cat.id && !isSearching;
                                    const activeStyle = "bg-white text-indigo-700 shadow-lg ring-1 ring-indigo-100 scale-100 z-10 border-indigo-200";
                                    const inactiveStyle = "bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border-transparent hover:shadow-md";

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setActiveCategory(cat.id);
                                                setSearch('');
                                            }}
                                            className={`p-4 rounded-xl text-left border transition-all duration-200 group relative ${isActive ? activeStyle : inactiveStyle}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm leading-tight">{cat.id}</h3>
                                                    {cat.desc && <p className="text-[10px] opacity-70 mt-0.5 font-medium">{cat.desc}</p>}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Mail size={100} />
                                </div>
                                <h4 className="font-bold relative z-10">Still Stuck?</h4>
                                <p className="text-indigo-200 text-xs mb-4 relative z-10">Our support team is just an email away.</p>
                                <a
                                    href="mailto:edustacks.tech@gmail.com"
                                    className="block w-full py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-all shadow-md relative z-10"
                                >
                                    Email Support
                                </a>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="lg:col-span-9">
                            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8">
                                {/* Breadcrumb / Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                            {isSearching ? 'Search Results' : activeCategory}
                                        </h2>
                                        <p className="text-slate-500 text-sm mt-1">
                                            {isSearching
                                                ? `Found ${displayedTopics.length + filteredFaqs.length} results for "${search}"`
                                                : helpCategories.find(c => c.id === activeCategory)?.desc || 'Help & Guides'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* AI Chat Wrapper */}
                                    {activeCategory === 'AI Assistant' && !isSearching ? (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <AiChatInterface categories={helpCategories} />
                                        </div>
                                    ) : (
                                        // Topics List
                                        <div className="space-y-4 min-h-[400px]">
                                            {displayedTopics.length > 0 ? (
                                                displayedTopics.map((topic, idx) => (
                                                    <Section
                                                        key={idx}
                                                        title={topic.title}
                                                        icon={topic.icon}
                                                        defaultOpen={isSearching || idx === 0}
                                                    >
                                                        {topic.content}
                                                    </Section>
                                                ))
                                            ) : (
                                                isSearching && filteredFaqs.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                                            <HelpCircle size={32} />
                                                        </div>
                                                        <h3 className="text-lg font-bold text-slate-900">No guides found</h3>
                                                        <p className="text-slate-500 text-sm">Try searching for keywords like "Student" or "Exam"</p>
                                                    </div>
                                                )
                                            )}

                                            {/* FAQs */}
                                            {filteredFaqs.length > 0 && (
                                                <div className="pt-8 animate-in fade-in duration-500">
                                                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                                                        Frequently Asked Questions
                                                    </h3>
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        {filteredFaqs.map((f, idx) => (
                                                            <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                                <h4 className="font-bold text-slate-800 mb-2 text-sm">{f.q}</h4>
                                                                <p className="text-sm text-slate-500">{f.a}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default HelpCenterPage;

