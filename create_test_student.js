import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestStudent() {
    const email = 'demo.student.lms@gmail.com';
    const password = 'password123';
    const name = 'Demo Student';

    console.log(`Creating test student: ${email}`);

    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('Error creating auth user:', authError.message);
        // If user already exists, we can still proceed to check/create the member record
        if (!authError.message.includes('already registered')) {
            return;
        }
        console.log('User might already exist in Auth, proceeding to check Members table...');
    } else {
        console.log('Auth user created successfully:', authData.user?.id);
    }

    // 2. Check if member exists
    const { data: existingMember, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .single();

    if (existingMember) {
        console.log('Member record already exists:', existingMember);
        // Update role to student just in case
        const { error: updateError } = await supabase
            .from('members')
            .update({ role: 'student', name: name })
            .eq('id', existingMember.id);

        if (updateError) console.error('Error updating member role:', updateError);
        else console.log('Member role verified/updated to student.');

    } else {
        // Create member record
        console.log('Creating member record...');
        const { data: newMember, error: createError } = await supabase
            .from('members')
            .insert([{
                name: name,
                email: email,
                role: 'student',
                status: 'Active',
                joining_date: new Date().toISOString()
            }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating member record:', createError);
        } else {
            console.log('Member record created successfully:', newMember);
        }
    }
}

createTestStudent();
