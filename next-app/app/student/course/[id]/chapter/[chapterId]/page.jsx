'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import StudentChapterContents from '../../../../../../components/StudentChapterContents';

const ChapterContentsPage = () => {
    const params = useParams();

    if (!params) return null;

    return <StudentChapterContents courseId={params.id} chapterId={params.chapterId} />;
};

export default ChapterContentsPage;
