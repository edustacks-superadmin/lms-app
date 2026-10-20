import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUsers } from '../context/UserContext';
import UserForm from './UserForm';

const EditUser = () => {
    const { id } = useParams();
    const { users, updateUser, loading: contextLoading } = useUsers();
    const [initialData, setInitialData] = useState(null);
    const [localLoading, setLocalLoading] = useState(true);

    useEffect(() => {
        if (contextLoading) return;

        console.log('EditUser: params id:', id);
        // Use loose equality or string conversion to handle number/string mismatch
        const user = users.find(u => String(u.id) === String(id));

        if (user) {
            setInitialData({
                username: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                display_name: user.displayName || '',
                email: user.email || '',
                mobile: user.phone_number || '',
                birth_date: user.birth_date || '',
                gender: user.gender || '',
                address1: user.address1 || '',
                address2: user.address2 || '',
                city: user.city || '',
                state: user.state || '',
                zip: user.zip || '',
                status: user.role || 'Student',
                batches: user.batchIds || [],
                photo_url: user.photo_url || null
            });
        }
        setLocalLoading(false);
    }, [id, users, contextLoading]);

    const handleUpdateUser = async (formData) => {
        return await updateUser(id, formData);
    };

    if (contextLoading || localLoading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading user details...</div>;
    }

    if (!initialData) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>User not found</div>;
    }

    return (
        <UserForm
            mode="edit"
            memberId={id}
            redirectUrl={`/members/${id}`}
            backPath={`/members/${id}`}
            initialData={initialData}
            onSubmit={handleUpdateUser}
            title="Edit Member"
            subtitle="Update member details and permissions."
        />
    );
};

export default EditUser;
