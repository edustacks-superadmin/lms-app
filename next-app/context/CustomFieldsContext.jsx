import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const CustomFieldsContext = createContext();

export const useCustomFields = () => {
    const context = useContext(CustomFieldsContext);
    if (!context) {
        throw new Error('useCustomFields must be used within CustomFieldsProvider');
    }
    return context;
};

export const CustomFieldsProvider = ({ children }) => {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch all registration fields
    const fetchFields = async () => {
        try {
            const { data, error } = await supabase
                .from('registration_fields')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            setFields(data || []);
        } catch (error) {
            console.error('Error fetching registration fields:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get only enabled fields (for registration form)
    const getEnabledFields = () => {
        return fields.filter(field => field.is_enabled);
    };

    // Get only preset fields (for settings UI)
    const getPresetFields = () => {
        return fields.filter(field => field.is_preset);
    };

    // Get only custom fields (for settings UI)
    const getCustomFields = () => {
        return fields.filter(field => !field.is_preset);
    };

    // Add a new custom field
    const addField = async (fieldData) => {
        try {
            // Generate field_key from label
            const field_key = fieldData.field_label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_|_$/g, '');

            const { data, error } = await supabase
                .from('registration_fields')
                .insert([{
                    ...fieldData,
                    field_key,
                    is_preset: false,
                    display_order: fields.length + 1
                }])
                .select()
                .single();

            if (error) throw error;

            setFields([...fields, data]);
            return { success: true, data };
        } catch (error) {
            console.error('Error adding field:', error);
            return { success: false, error: error.message };
        }
    };

    // Update an existing field
    const updateField = async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from('registration_fields')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setFields(fields.map(f => f.id === id ? data : f));
            return { success: true, data };
        } catch (error) {
            console.error('Error updating field:', error);
            return { success: false, error: error.message };
        }
    };

    // Delete a custom field (only non-preset fields can be deleted)
    const deleteField = async (id) => {
        try {
            const field = fields.find(f => f.id === id);
            if (field?.is_preset) {
                return { success: false, error: 'Cannot delete preset fields' };
            }

            const { error } = await supabase
                .from('registration_fields')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setFields(fields.filter(f => f.id !== id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting field:', error);
            return { success: false, error: error.message };
        }
    };

    // Toggle field enabled status
    const toggleFieldEnabled = async (id) => {
        const field = fields.find(f => f.id === id);
        if (!field) return { success: false, error: 'Field not found' };

        return await updateField(id, { is_enabled: !field.is_enabled });
    };

    // Toggle field required status
    const toggleFieldRequired = async (id) => {
        const field = fields.find(f => f.id === id);
        if (!field) return { success: false, error: 'Field not found' };

        return await updateField(id, { is_required: !field.is_required });
    };

    // Reorder fields
    const reorderFields = async (reorderedFields) => {
        try {
            // Update display_order for all fields
            const updates = reorderedFields.map((field, index) => ({
                id: field.id,
                display_order: index + 1
            }));

            // Use Promise.all to update all fields
            const promises = updates.map(({ id, display_order }) =>
                supabase
                    .from('registration_fields')
                    .update({ display_order })
                    .eq('id', id)
            );

            await Promise.all(promises);

            // Update local state
            setFields(reorderedFields.map((field, index) => ({
                ...field,
                display_order: index + 1
            })));

            return { success: true };
        } catch (error) {
            console.error('Error reordering fields:', error);
            return { success: false, error: error.message };
        }
    };

    useEffect(() => {
        fetchFields();
    }, []);

    const value = {
        fields,
        loading,
        fetchFields,
        getEnabledFields,
        getPresetFields,
        getCustomFields,
        addField,
        updateField,
        deleteField,
        toggleFieldEnabled,
        toggleFieldRequired,
        reorderFields
    };

    return (
        <CustomFieldsContext.Provider value={value}>
            {children}
        </CustomFieldsContext.Provider>
    );
};
