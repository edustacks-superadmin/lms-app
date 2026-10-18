'use client';

import React, { useState } from 'react';
import { X, Mail, Bell, Send, Copy, Check, Loader2, Info } from 'lucide-react';

const AVAILABLE_VARIABLES = [
    { variable: '{{student_name}}', description: 'Name of the student' },
    { variable: '{{content_name}}', description: 'Name of the content/lesson' },
    { variable: '{{chapter_name}}', description: 'Name of the chapter' },
    { variable: '{{course_name}}', description: 'Name of the course' },
    { variable: '{{institute_name}}', description: 'Name of your institute' },
    { variable: '{{logo_url}}', description: 'Institute logo image URL' },
    { variable: '{{content_url}}', description: 'Web link to the content' },
    { variable: '{{mobile_content_url}}', description: 'Direct link for mobile app' },
    { variable: '{{login_link}}', description: 'Link to the login page' },
    { variable: '{{username}}', description: 'Email address of the student' },
];

const DEFAULT_EMAIL_SUBJECT = '[{{institute_name}}] {{content_name}} has been added to {{course_name}}';
const DEFAULT_EMAIL_BODY = `<div style="text-align: center; margin-bottom: 20px;">
<img src="{{logo_url}}" alt="{{institute_name}}" style="max-width: 150px; height: auto;" />
</div>
<p>Hello {{student_name}},</p>
<p>A new content <strong>{{content_name}}</strong> has been added to the course <strong>{{course_name}}</strong>.</p>
<p><a href="{{content_url}}">Click here</a> to access the content.</p>
<br/>
<p>Cheers,</p>
<p>{{institute_name}}</p>`;

const DEFAULT_PUSH_TITLE = '{{content_name}} available';
const DEFAULT_PUSH_SUMMARY = 'New content added to {{course_name}}';

export default function SendNotificationModal({
    isOpen,
    onClose,
    contentId,
    contentName,
    chapterName,
    chapterId,
    courseId,
    courseName,
    onSuccess
}) {
    const [sendEmail, setSendEmail] = useState(true);
    const [sendPush, setSendPush] = useState(true);
    const [emailSubject, setEmailSubject] = useState(DEFAULT_EMAIL_SUBJECT);
    const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);
    const [pushTitle, setPushTitle] = useState(DEFAULT_PUSH_TITLE);
    const [pushSummary, setPushSummary] = useState(DEFAULT_PUSH_SUMMARY);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [copiedVar, setCopiedVar] = useState(null);

    if (!isOpen) return null;

    const copyVariable = (variable) => {
        navigator.clipboard.writeText(variable);
        setCopiedVar(variable);
        setTimeout(() => setCopiedVar(null), 2000);
    };

    const handleSend = async () => {
        if (!sendEmail && !sendPush) {
            alert('Please select at least one notification method');
            return;
        }

        setSending(true);
        setResult(null);

        try {
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content_id: contentId,
                    course_id: courseId,
                    chapter_id: chapterId,
                    content_name: contentName,
                    chapter_name: chapterName,
                    course_name: courseName,
                    send_email: sendEmail,
                    send_push: sendPush,
                    email_subject: emailSubject,
                    email_body: emailBody,
                    push_title: pushTitle,
                    push_summary: pushSummary
                })
            });

            const data = await response.json();

            if (data.success) {
                setResult({
                    type: 'success',
                    message: `Notifications sent! Email: ${data.email_sent}, Push: ${data.push_sent} of ${data.total_recipients} recipients`
                });
                if (onSuccess) onSuccess(data);
            } else {
                setResult({
                    type: 'error',
                    message: data.error || 'Failed to send notifications'
                });
            }
        } catch (error) {
            setResult({
                type: 'error',
                message: error.message || 'An error occurred'
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                            Send Notification
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                            {contentName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex'
                        }}
                    >
                        <X size={20} color="#6b7280" />
                    </button>
                </div>

                {/* Body */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    display: 'flex',
                    gap: '24px'
                }}>
                    {/* Left Column - Form */}
                    <div style={{ flex: 1 }}>
                        {/* Info Box */}
                        <div style={{
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '20px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <Info size={18} color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
                                When enabled, all students who have access to this course will receive a notification,
                                except those who have already accessed the content.
                            </p>
                        </div>

                        {/* Email Section */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '16px',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={sendEmail}
                                    onChange={(e) => setSendEmail(e.target.checked)}
                                    style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                                />
                                <Mail size={18} color="#2563eb" />
                                <span style={{ fontWeight: '600', color: '#111827' }}>By Email</span>
                            </label>

                            {sendEmail && (
                                <div style={{ marginLeft: '32px' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            color: '#374151',
                                            marginBottom: '6px'
                                        }}>
                                            Subject
                                        </label>
                                        <input
                                            type="text"
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            color: '#374151',
                                            marginBottom: '6px'
                                        }}>
                                            Body
                                        </label>
                                        <textarea
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                            rows={6}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                resize: 'vertical',
                                                fontFamily: 'monospace',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Push Section */}
                        <div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '16px',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={sendPush}
                                    onChange={(e) => setSendPush(e.target.checked)}
                                    style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                                />
                                <Bell size={18} color="#2563eb" />
                                <span style={{ fontWeight: '600', color: '#111827' }}>By Push Notification</span>
                            </label>

                            {sendPush && (
                                <div style={{ marginLeft: '32px' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            color: '#374151',
                                            marginBottom: '6px'
                                        }}>
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={pushTitle}
                                            onChange={(e) => setPushTitle(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            color: '#374151',
                                            marginBottom: '6px'
                                        }}>
                                            Summary
                                        </label>
                                        <textarea
                                            value={pushSummary}
                                            onChange={(e) => setPushSummary(e.target.value)}
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                resize: 'vertical',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Variables */}
                    <div style={{
                        width: '240px',
                        flexShrink: 0,
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        padding: '16px'
                    }}>
                        <h4 style={{
                            margin: '0 0 12px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <Info size={14} />
                            Available Variables
                        </h4>
                        <p style={{
                            margin: '0 0 12px',
                            fontSize: '12px',
                            color: '#6b7280'
                        }}>
                            Click to copy to clipboard
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {AVAILABLE_VARIABLES.map(({ variable, description }) => (
                                <button
                                    key={variable}
                                    onClick={() => copyVariable(variable)}
                                    style={{
                                        padding: '8px 10px',
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}>
                                        <code style={{
                                            fontSize: '12px',
                                            color: '#dc2626',
                                            fontWeight: '500'
                                        }}>
                                            {variable}
                                        </code>
                                        {copiedVar === variable ? (
                                            <Check size={14} color="#16a34a" />
                                        ) : (
                                            <Copy size={14} color="#9ca3af" />
                                        )}
                                    </div>
                                    <p style={{
                                        margin: '4px 0 0',
                                        fontSize: '11px',
                                        color: '#6b7280'
                                    }}>
                                        {description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {result && (
                        <div style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: result.type === 'success' ? '#ecfdf5' : '#fef2f2',
                            color: result.type === 'success' ? '#047857' : '#dc2626',
                            fontSize: '13px'
                        }}>
                            {result.message}
                        </div>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                color: '#374151'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={sending || (!sendEmail && !sendPush)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: sending ? '#93c5fd' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: sending ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {sending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Send
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
