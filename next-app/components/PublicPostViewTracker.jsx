'use client';

import { useEffect, useRef } from 'react';
import { incrementPostView } from '../app/actions/posts';

export default function PublicPostViewTracker({ postId }) {
    const hasIncremented = useRef(false);

    useEffect(() => {
        // Only increment once per component mount (strict mode defense)
        if (postId && !hasIncremented.current) {
            hasIncremented.current = true;
            incrementPostView(postId).catch(console.error);
        }
    }, [postId]);

    // This component doesn't render anything
    return null;
}
