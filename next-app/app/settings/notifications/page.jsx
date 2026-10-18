'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Send, Clock, Settings, Plus, Mail, Smartphone, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const NotificationsPage = () => {
    const [activeTab, setActiveTab] = useState('history');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [pendingExams, setPendingExams] = useState([]);
    const [pendingPosts, setPendingPosts] = useState([]);
    const [pendingContent, setPendingContent] = useState([]);

    // Manual notification form
    const [form, setForm] = useState({
        title: '',
        body: '',
        channel: 'both', // 'push', 'email', 'both'
        target: 'all' // 'all', 'course', 'product'
    });

    useEffect(() => {
        if (activeTab === 'history') fetchLogs();
        if (activeTab === 'pending') fetchPending();
    }, [activeTab]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notification_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error) setLogs(data || []);
        } catch (err) {
            console.error('Error fetching logs:', err);
        }
        setLoading(false);
    };

    const fetchPending = async () => {
        setLoading(true);
        try {
            const now = new Date().toISOString();

            // Fetch pending exams (not notified)
            const { data: exams } = await supabase
                .from('exams')
                .select('id, title, start_date')
                .eq('notification_sent', false)
                .eq('is_active', true)
                .order('start_date', { ascending: true })
                .limit(50);

            setPendingExams(exams || []);

            // Fetch pending posts (not notified)
            const { data: posts } = await supabase
                .from('posts')
                .select('id, title, publication_date')
                .eq('notification_sent', false)
                .eq('status', 'published')
                .eq('is_deleted', false)
                .order('publication_date', { ascending: true })
                .limit(50);

            setPendingPosts(posts || []);

            // Fetch pending content (not notified)
            const { data: content } = await supabase
                .from('chapter_contents')
                .select('id, title, type, available_from')
                .eq('notification_sent', false)
                .in('type', ['pdf', 'video'])
                .order('available_from', { ascending: true })
                .limit(50);

            setPendingContent(content || []);
        } catch (err) {
            console.error('Error fetching pending:', err);
        }
        setLoading(false);
    };

    const sendManualNotification = async () => {
        if (!form.title || !form.body) {
            alert('Please fill in title and body');
            return;
        }

        setSending(true);
        try {
            const response = await fetch('/api/notifications/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    body: form.body,
                    channel: form.channel,
                    target: form.target
                })
            });

            const result = await response.json();
            if (result.success) {
                alert(`Notification sent to ${result.recipients_count} recipients!`);
                setForm({ title: '', body: '', channel: 'both', target: 'all' });
                if (activeTab === 'history') fetchLogs();
            } else {
                alert('Failed to send: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Error sending notification');
        }
        setSending(false);
    };

    const triggerCron = async (type) => {
        try {
            const response = await fetch(`/api/cron/${type}-notifications`);
            const result = await response.json();
            alert(result.message || 'Cron triggered');
            fetchLogs();
        } catch (err) {
            alert('Failed to trigger cron');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            // Remove timezone info (Z or offset) to treat as Local Time "Face Value"
            // This matches how the "Scheduled" input displays it
            const cleanDateStr = dateStr.replace(/Z|[+-]\d{2}:?\d{2}$/, '');
            const date = new Date(cleanDateStr);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return dateStr;
            }

            return date.toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateStr;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'partial': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            default: return null;
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'exam': return '📝';
            case 'post': return '📰';
            case 'manual': return '📢';
            default: return '🔔';
        }
    };

    const tabs = [
        { id: 'history', label: 'History', icon: Clock },
        { id: 'pending', label: 'Pending', icon: Bell },
        { id: 'send', label: 'Send New', icon: Send },
        { id: 'settings', label: 'Settings', icon: Settings }
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
                        <p className="text-sm text-slate-500">Manage push & email notifications</p>
                    </div>
                </div>

                <button
                    onClick={() => setActiveTab('send')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Send New
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-semibold text-slate-800">Notification History</h2>
                        <button onClick={fetchLogs} className="text-slate-500 hover:text-slate-700">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No notifications sent yet</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Subject</th>
                                    <th className="px-4 py-3">Push</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Recipients</th>
                                    <th className="px-4 py-3">Sent At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-lg">{getTypeIcon(log.notification_type)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{log.subject}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {log.push_sent_count > 0 && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Smartphone className="w-3 h-3 text-blue-500" />
                                                    {log.push_sent_count}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {log.email_sent_count > 0 && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Mail className="w-3 h-3 text-green-500" />
                                                    {log.email_sent_count}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{log.recipients_count}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{formatDate(log.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Pending Tab */}
            {activeTab === 'pending' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-semibold text-slate-800">📝 Pending Exam Notifications</h2>
                            <button onClick={() => triggerCron('exam')} className="text-sm text-blue-600 hover:underline">
                                Trigger All Now
                            </button>
                        </div>
                        {pendingExams.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No pending exam notifications</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pendingExams.map(exam => (
                                    <div key={exam.id} className="px-4 py-3 flex justify-between items-center">
                                        <span className="text-sm text-slate-700">{exam.title}</span>
                                        <span className="text-xs text-slate-500">{formatDate(exam.start_date)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-semibold text-slate-800">📰 Pending Post Notifications</h2>
                            <button onClick={() => triggerCron('post')} className="text-sm text-blue-600 hover:underline">
                                Trigger All Now
                            </button>
                        </div>
                        {pendingPosts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No pending post notifications</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pendingPosts.map(post => (
                                    <div key={post.id} className="px-4 py-3 flex justify-between items-center">
                                        <span className="text-sm text-slate-700">{post.title}</span>
                                        <span className="text-xs text-slate-500">{formatDate(post.publication_date)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-semibold text-slate-800">📄 Pending Content (PDF/Video)</h2>
                            <button onClick={() => triggerCron('content')} className="text-sm text-blue-600 hover:underline">
                                Trigger All Now
                            </button>
                        </div>
                        {pendingContent.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No pending content notifications</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pendingContent.map(item => (
                                    <div key={item.id} className="px-4 py-3 flex justify-between items-center">
                                        <span className="text-sm text-slate-700">
                                            {item.type === 'pdf' ? '📄' : '🎬'} {item.title}
                                        </span>
                                        <span className="text-xs text-slate-500">{formatDate(item.available_from)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Send New Tab */}
            {activeTab === 'send' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-xl">
                    <h2 className="font-semibold text-slate-800 mb-4">Send Manual Notification</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Notification title"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                            <textarea
                                value={form.body}
                                onChange={(e) => setForm({ ...form, body: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Notification message"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
                            <div className="flex gap-3">
                                {[
                                    { id: 'push', label: 'Push Only', icon: Smartphone },
                                    { id: 'email', label: 'Email Only', icon: Mail },
                                    { id: 'both', label: 'Both', icon: Bell }
                                ].map(ch => (
                                    <label key={ch.id} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${form.channel === ch.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                        <input
                                            type="radio"
                                            name="channel"
                                            value={ch.id}
                                            checked={form.channel === ch.id}
                                            onChange={() => setForm({ ...form, channel: ch.id })}
                                            className="sr-only"
                                        />
                                        <ch.icon className="w-4 h-4" />
                                        <span className="text-sm">{ch.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                            <select
                                value={form.target}
                                onChange={(e) => setForm({ ...form, target: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            >
                                <option value="all">All Users</option>
                            </select>
                        </div>

                        <button
                            onClick={sendManualNotification}
                            disabled={sending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {sending ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Notification
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-xl">
                    <h2 className="font-semibold text-slate-800 mb-4">Notification Settings</h2>
                    <p className="text-slate-500 text-sm">
                        Automatic notifications are sent via cron jobs configured at cron-job.org.
                    </p>

                    <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                                <div className="font-medium text-slate-700">📝 Exam Notifications</div>
                                <div className="text-sm text-slate-500">Auto-notify when exams start</div>
                            </div>
                            <span className="text-green-600 text-sm font-medium">Active</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                                <div className="font-medium text-slate-700">📰 Post Notifications</div>
                                <div className="text-sm text-slate-500">Auto-notify when posts are published</div>
                            </div>
                            <span className="text-green-600 text-sm font-medium">Active</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                                <div className="font-medium text-slate-700">📄 Content Notifications</div>
                                <div className="text-sm text-slate-500">Auto-notify when PDF/Video content is available</div>
                            </div>
                            <span className="text-green-600 text-sm font-medium">Active</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
