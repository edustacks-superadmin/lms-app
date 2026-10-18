'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { incrementPostLike } from '../app/actions/posts';

export default function PublicPostLike({ postId, initialLikes = 0 }) {
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Check if already liked in this session via local storage (sync with cookie)
        const likedKey = `liked_post_${postId}`;
        if (localStorage.getItem(likedKey)) {
            setIsLiked(true);
        }
    }, [postId]);

    const handleLike = async () => {
        if (isLiked) return;

        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);

        // Optimistic update
        setLikes(prev => prev + 1);
        setIsLiked(true);

        // Persist locally
        localStorage.setItem(`liked_post_${postId}`, 'true');

        try {
            const result = await incrementPostLike(postId);
            if (!result.success) {
                // Rollback if failed
                if (!result.alreadyLiked) {
                    setLikes(prev => Math.max(0, prev - 1));
                    setIsLiked(false);
                    localStorage.removeItem(`liked_post_${postId}`);
                }
            }
        } catch (error) {
            console.error('Error liking post:', error);
            setLikes(prev => Math.max(0, prev - 1));
            setIsLiked(false);
            localStorage.removeItem(`liked_post_${postId}`);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleLike}
                disabled={isLiked}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-300 border ${isLiked
                        ? 'bg-rose-50 border-rose-100 text-rose-600 scale-105'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50/30'
                    } ${isAnimating ? 'animate-bounce' : ''}`}
                title={isLiked ? "You found this helpful" : "Mark as helpful"}
            >
                <Heart
                    size={18}
                    fill={isLiked ? "currentColor" : "none"}
                    className={`${isAnimating ? 'scale-125' : ''} transition-transform duration-300`}
                />
                <span className="text-sm font-semibold">
                    {likes > 0 ? `${likes} Helpful` : "Helpful?"}
                </span>
            </button>
        </div>
    );
}
