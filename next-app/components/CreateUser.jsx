'use client';

import React, { Suspense } from 'react';
import { useUsers } from '../context/UserContext';
import { useSearchParams } from 'next/navigation';
import UserForm from './UserForm';

// Wrap content that uses useSearchParams in a Suspense boundary or a separate component
const CreateUserContent = () => {
    const { addUser } = useUsers();
    const searchParams = useSearchParams();

    // Check if we have a pre-selected batch from query params
    const preselectedBatchId = searchParams.get('selectedBatchId');
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

const CreateUser = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateUserContent />
        </Suspense>
    );
};

export default CreateUser;
