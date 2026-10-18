import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMockStudent() {
    const mockUser = {
        name: 'Demo Student',
        email: 'student@demo.com',
        role: 'student',
        status: 'Active',
        joining_date: new Date().toISOString()
    };

    console.log('Creating mock student in members table...');

    // Check if exists
    const { data: existing } = await supabase
        .from('members')
        .select('*')
        .eq('email', mockUser.email)
        .single();

    if (existing) {
        console.log('Mock student already exists:', existing);
        return;
    }

    const { data, error } = await supabase
        .from('members')
        .insert([mockUser])
        .select()
        .single();

    if (error) {
        console.error('Error creating mock student:', error);
    } else {
        console.log('Mock student created successfully:', data);
    }
}

createMockStudent();
