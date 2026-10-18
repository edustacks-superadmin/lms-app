import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const TestSignup = () => {
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        createTestUser();
    }, []);

    const createTestUser = async () => {
        try {
            setStatus('Attempting to sign up student@test.com...');

            const { data, error } = await supabase.auth.signUp({
                email: 'student@test.com',
                password: 'password123',
                options: {
                    data: {
                        name: 'Test Student',
                        role: 'student' // Trying to set metadata, though members table is source of truth
                    }
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    setStatus('User student@test.com already exists. You can log in with password123.');
                } else {
                    setStatus('Error: ' + error.message);
                }
            } else {
                setStatus('Success! User created. Please run the SQL script to ensure role is set in members table.');
            }
        } catch (err) {
            setStatus('Exception: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>Test User Creation</h2>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: status.includes('Success') ? 'green' : 'blue' }}>
                {status}
            </p>
        </div>
    );
};

export default TestSignup;
