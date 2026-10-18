import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const SubjectContext = createContext();

export const useSubjects = () => useContext(SubjectContext);

export const SubjectProvider = ({ children }) => {
    const { institute } = useInstitute();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchSubjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('*')
                .eq('institute_id', institute?.id)
                .order('name', { ascending: true });

            if (subjectsError) throw subjectsError;

            setSubjects(subjectsData || []);
        } catch (err) {
            console.error('Error fetching subjects:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addSubject = async (subjectData) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('subjects')
                .insert([{ ...subjectData, institute_id: institute?.id }])
                .select();

            if (error) throw error;

            setSubjects(prev => [...prev, { ...data[0], questionCount: 0 }]);
            return { success: true, data };
        } catch (err) {
            console.error('Error adding subject:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateSubject = async (id, subjectData) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('subjects')
                .update(subjectData)
                .eq('id', id)
                .select();

            if (error) throw error;

            setSubjects(prev =>
                prev.map(sub => sub.id === id ? { ...sub, ...data[0] } : sub)
            );
            return { success: true, data };
        } catch (err) {
            console.error('Error updating subject:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const deleteSubject = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('subjects')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSubjects(prev => prev.filter(sub => sub.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting subject:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    return (
        <SubjectContext.Provider
            value={{
                subjects,
                fetchSubjects,
                addSubject,
                updateSubject,
                deleteSubject,
                loading,
                error
            }}
        >
            {children}
        </SubjectContext.Provider>
    );
};
