import React from 'react';
import { useUsers } from '../context/UserContext';
import { useLocation } from 'react-router-dom';
import UserForm from './UserForm';

const CreateUser = () => {
    const { addUser } = useUsers();
    const location = useLocation();

    // Check if we have a pre-selected batch from navigation state
    const preselectedBatchId = location.state?.selectedBatchId;
    const initialData = preselectedBatchId ? { batches: [preselectedBatchId] } : {};

    const handleCreateUser = async (formData) => {
        return await addUser(formData);
    };

    return (
        <UserForm
            mode="create"
            initialData={initialData}
            onSubmit={handleCreateUser}
            title="Add a new member"
            subtitle="Fill in the details to create a new user account."
        />
    );
};

export default CreateUser;
