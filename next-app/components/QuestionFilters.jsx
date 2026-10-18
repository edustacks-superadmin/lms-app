'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';
import MultiSelect from './MultiSelect';
import { useInstitute } from '../context/InstituteContext';
import { useSubjects } from '../context/SubjectContext';
import { useQuestionFolders } from '../context/QuestionFolderContext';

const QuestionFilters = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { institute } = useInstitute();
    const { subjects } = useSubjects();
    const { folders } = useQuestionFolders();
    const [tags, setTags] = useState([]);

    // State for filters (all arrays now)
    const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subjectId') ? searchParams.get('subjectId').split(',') : []);
    const [selectedDifficulty, setSelectedDifficulty] = useState(searchParams.get('difficulty') ? searchParams.get('difficulty').split(',') : []);
    const [selectedType, setSelectedType] = useState(searchParams.get('type') ? searchParams.get('type').split(',') : []);
    const [selectedFolder, setSelectedFolder] = useState(searchParams.get('folderId') ? searchParams.get('folderId').split(',') : []);
    const [selectedTag, setSelectedTag] = useState(searchParams.get('tags') ? searchParams.get('tags').split(',') : []);

    // Fetch Tags for Dropdown (using admin API to get all available question tags)
    useEffect(() => {
        const fetchTags = async () => {
            if (!institute?.id) return;
            try {
                const res = await fetch(`/api/admin/tags?institute_id=${institute.id}`);
                const data = await res.json();
                if (data.tags) {
                    setTags(data.tags);
                }
            } catch (error) {
                console.error("Error fetching tags:", error);
            }
        };
        fetchTags();
    }, [institute?.id]);

    // Update filters on change
    const updateFilter = (key, values) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));

        if (values && values.length > 0) {
            current.set(key, values.join(','));
        } else {
            current.delete(key);
        }

        // Reset page to 1 on filter change
        current.set('page', '1');

        // Use router.push directly
        router.push(`/questions?${current.toString()}`);
    };

    const clearFilters = () => {
        setSelectedSubject([]);
        setSelectedDifficulty([]);
        setSelectedType([]);
        setSelectedFolder([]);
        setSelectedTag([]);
        router.push('/questions');
    };

    const hasActiveFilters = selectedSubject.length > 0 || selectedDifficulty.length > 0 || selectedType.length > 0 || selectedFolder.length > 0 || selectedTag.length > 0;

    return (
        <div className="p-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Filters
                </h4>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                        <X size={12} /> Clear
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <MultiSelect
                    label="Subjects"
                    placeholder="All Subjects"
                    options={subjects.map(s => ({ value: String(s.id), label: s.name }))}
                    value={selectedSubject}
                    onChange={(vals) => { setSelectedSubject(vals); updateFilter('subjectId', vals); }}
                />

                <MultiSelect
                    label="Difficulty"
                    placeholder="All Levels"
                    options={[
                        { value: 'Easy', label: 'Easy' },
                        { value: 'Medium', label: 'Medium' },
                        { value: 'Hard', label: 'Hard' }
                    ]}
                    value={selectedDifficulty}
                    onChange={(vals) => { setSelectedDifficulty(vals); updateFilter('difficulty', vals); }}
                    searchable={false}
                />

                <MultiSelect
                    label="Type"
                    placeholder="All Types"
                    options={[
                        { value: 'MCQ', label: 'MCQ' },
                        { value: 'T/F', label: 'True / False' },
                        { value: 'FIB', label: 'Fill in Blanks' },
                        { value: 'SA', label: 'Short Answer' }
                    ]}
                    value={selectedType}
                    onChange={(vals) => { setSelectedType(vals); updateFilter('type', vals); }}
                    searchable={false}
                />

                <MultiSelect
                    label="Folders"
                    placeholder="All Folders"
                    options={folders.map(f => ({ value: String(f.id), label: f.name }))}
                    value={selectedFolder}
                    onChange={(vals) => { setSelectedFolder(vals); updateFilter('folderId', vals); }}
                />

                <MultiSelect
                    label="Tags"
                    placeholder="All Tags"
                    options={tags.map(t => ({ value: t.name, label: t.name }))}
                    value={selectedTag}
                    onChange={(vals) => { setSelectedTag(vals); updateFilter('tags', vals); }}
                />
            </div>
        </div>
    );
};

export default QuestionFilters;
