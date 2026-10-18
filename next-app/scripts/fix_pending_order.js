const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://xalbtjoykovnlbjeddtv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98'
);

async function fixOrder() {
    const orderId = 12;
    const memberId = 13790;
    const productId = 10;

    console.log(`Fixing Order #${orderId}...`);

    // 1. Update Order Status
    const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

    if (updateError) {
        console.error('Failed to update order:', updateError);
        return;
    }
    console.log('Order status updated to completed.');

    // 2. Find Linked Course
    const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('id')
        .contains('allowed_products', [productId]);

    if (courseError || !courses || courses.length === 0) {
        console.error('No course found linked to product:', productId);
        return;
    }

    console.log('Found linked courses:', courses.map(c => c.id));

    // 3. Enroll Student
    const enrollmentData = courses.map(course => ({
        student_id: memberId,
        course_id: course.id,
        status: 'active',
        progress: 0
    }));

    const { error: enrollError } = await supabase
        .from('enrollments')
        .insert(enrollmentData);

    if (enrollError) {
        if (enrollError.code === '23505') {
            console.log('User already enrolled (duplicate key).');
        } else {
            console.error('Enrollment failed:', enrollError);
        }
    } else {
        console.log('User enrolled successfully.');
    }
}

fixOrder();
