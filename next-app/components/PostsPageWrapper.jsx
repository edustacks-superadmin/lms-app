'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import CreatePost from './CreatePost';
import PostList from './PostList';

const PostsPageWrapper = () => {
    const pathname = usePathname();
    const { id } = useParams();
    const isCreate = pathname === '/posts/create';
    const isEdit = pathname?.startsWith('/posts/edit/');

    return (
        <div>
            {isCreate || isEdit ? (
                <CreatePost />
            ) : (
                <PostList />
            )}
// End of component
        </div>
    );
};

export default PostsPageWrapper;
