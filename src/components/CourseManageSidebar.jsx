import React, { useEffect, useMemo } from 'react';
import {
    BookOpen, Settings, Lock, Copy, Users, DollarSign,
    FileText, Tag, Layers, GraduationCap, ClipboardList,
    MessageSquare, Trash2
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useChapters } from '../context/ChapterContext';

const CourseManageSidebar = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const { chapters, fetchChapters } = useChapters();

    const lastFetchedId = React.useRef(null);

    useEffect(() => {
        if (id && lastFetchedId.current !== id) {
            // If we already have chapters for this course, mark as fetched and skip
            if (chapters && chapters.length > 0 && chapters[0].course_id == id) {
                lastFetchedId.current = id;
                return;
            }

            // Otherwise fetch
            fetchChapters(id);
            lastFetchedId.current = id;
        }
    }, [id, chapters, fetchChapters]);

    const contentCount = useMemo(() => {
        if (!chapters) return 0;

        return chapters.reduce((total, chapter) => {
            // Only count contents if the chapter belongs to the current course (safety check)
            if (chapter.course_id != id) return total;
            return total + (chapter.chapter_contents?.length || 0);
        }, 0);
    }, [chapters, id]);

    const menuItems = [
        { name: 'Contents', icon: BookOpen, count: contentCount, path: `/courses/${id}/chapters` },
        { name: 'Settings', icon: Settings, path: `/courses/${id}/settings` },
        { name: 'Access Control', icon: Lock, path: `/courses/${id}/access-control` },
        { name: 'Clone', icon: Copy, path: `/courses/${id}/clone` },
        { name: 'Add Staffs', icon: Users, comingSoon: true },
        { name: 'Pricing', icon: DollarSign, comingSoon: true },
        { name: 'Edit Sales Page', icon: FileText, comingSoon: true },
        { name: 'Coupons', icon: Tag, comingSoon: true },
        { name: 'Bundles', icon: Layers, comingSoon: true },
        { name: 'Learners', icon: GraduationCap, comingSoon: true },
        { name: 'Assignments', icon: ClipboardList, comingSoon: true },
        { name: 'Feedback', icon: MessageSquare, comingSoon: true },
        { name: 'Delete', icon: Trash2, path: `/courses/${id}/delete` },
    ];

    return (
        <aside style={{ width: '250px', flexShrink: 0, padding: '20px 16px 20px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {menuItems.map((item, index) => {
                    const isActive = item.path && location.pathname === item.path;
                    return (
                        <button
                            key={index}
                            className="btn"
                            onClick={() => {
                                if (item.path) {
                                    navigate(item.path);
                                }
                            }}
                            style={{
                                justifyContent: 'flex-start',
                                width: '100%',
                                backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                                color: isActive ? 'white' : 'var(--primary-color)',
                                border: 'none',
                                padding: '10px 15px',
                                fontSize: '14px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            <item.icon size={18} />
                            <span style={{ flex: 1, textAlign: 'left' }}>{item.name}</span>
                            {(item.count !== undefined && item.count !== null) && (
                                <span style={{
                                    backgroundColor: '#eee',
                                    color: '#666',
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    borderRadius: '10px'
                                }}>
                                    {item.count}
                                </span>
                            )}
                            {item.badge && (
                                <span style={{
                                    backgroundColor: item.badgeColor,
                                    color: 'white',
                                    fontSize: '10px',
                                    padding: '2px 4px',
                                    borderRadius: '2px'
                                }}>
                                    {item.badge}
                                </span>
                            )}
                            {item.comingSoon && (
                                <span style={{
                                    backgroundColor: '#ffa726',
                                    color: 'white',
                                    fontSize: '9px',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    fontWeight: 'bold'
                                }}>
                                    SOON
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </aside>
    );
};

export default CourseManageSidebar;
