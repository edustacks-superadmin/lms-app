import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrder() {
    console.log('--- DEBUGGING LAST ORDER ---');

    // 1. Fetch last order
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (orderError) {
        console.error('Error fetching orders:', orderError);
        return;
    }

    if (!orders || orders.length === 0) {
        console.log('No orders found.');
        return;
    }

    const order = orders[0];
    console.log('1. Latest Order:', {
        id: order.id,
        user_email: order.user_email,
        product_id: order.product_id,
        status: order.status,
        amount: order.amount,
        created_at: order.created_at
    });

    // 2. Fetch Member
    console.log(`\n2. Looking for member with email: ${order.user_email}`);
    const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, email, first_name')
        .ilike('email', order.user_email)
        .single();

    if (memberError) {
        console.error('Error fetching member:', memberError);
    } else if (!member) {
        console.error('MEMBER NOT FOUND for email:', order.user_email);
    } else {
        console.log('Member Found:', member);
    }

    // 3. Fetch Product
    console.log(`\n3. Looking for product with ID: ${order.product_id}`);
    const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, title, course_id')
        .eq('id', order.product_id)
        .single();

    if (productError) {
        console.error('Error fetching product:', productError);
    } else if (!product) {
        console.error('PRODUCT NOT FOUND');
    } else {
        console.log('Product Found:', product);
    }

    // 4. Check Course Links
    if (product) {
        console.log('\n4. Checking Course Links:');

        // A. Direct Link
        console.log(`   A. Checking product.course_id: ${product.course_id}`);

        // B. Allowed Products Link
        console.log(`   B. Checking courses with allowed_products containing ${product.id}...`);
        const { data: coursesByAllowed, error: allowedError } = await supabase
            .from('courses')
            .select('id, title, allowed_products')
            .contains('allowed_products', [product.id]);

        if (allowedError) {
            console.error('   Error checking allowed_products:', allowedError);
        } else {
            console.log(`   Found ${coursesByAllowed.length} courses via allowed_products:`);
            coursesByAllowed.forEach(c => console.log(`      - ${c.title} (${c.id})`));
        }

        // C. Title Match Link
        console.log(`   C. Checking courses by title match: "%${product.title}%"...`);
        const { data: coursesByTitle, error: titleError } = await supabase
            .from('courses')
            .select('id, title')
            .ilike('title', `%${product.title}%`);

        if (titleError) {
            console.error('   Error checking title match:', titleError);
        } else {
            console.log(`   Found ${coursesByTitle.length} courses via title match:`);
            coursesByTitle.forEach(c => console.log(`      - ${c.title} (${c.id})`));
        }
    }

    // 5. Check Enrollments
    if (member) {
        console.log(`\n5. Checking Enrollments for Member ${member.id}:`);
        const { data: enrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select('id, course_id, status, enrolled_at')
            .eq('student_id', member.id);

        if (enrollError) {
            console.error('Error fetching enrollments:', enrollError);
        } else {
            console.log(`   Found ${enrollments.length} enrollments:`);
            enrollments.forEach(e => console.log(`      - Course: ${e.course_id}, Status: ${e.status}, At: ${e.enrolled_at}`));
        }
    }
}

debugOrder();
