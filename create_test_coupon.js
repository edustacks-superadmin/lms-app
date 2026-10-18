
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestCoupon() {
    const coupon = {
        type: 'coupon',
        code: 'TEST50',
        discount_type: 'percentage',
        discount_value: 50,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
        status: 'active',
        applicable_products: [] // All products
    }

    const { data, error } = await supabase
        .from('offers')
        .insert([coupon])
        .select()

    if (error) {
        console.error('Error creating coupon:', error)
    } else {
        console.log('Coupon created:', data)
    }
}

createTestCoupon()
