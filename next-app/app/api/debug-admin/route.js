import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    const isServiceKeySet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const envVarLength = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0;

    console.log('Diagnostic: Service Key Set?', isServiceKeySet);
    console.log('Diagnostic: Service Key Length:', envVarLength);

    // Try a simple admin operation
    const { data, error } = await supabaseAdmin.from('products').select('id').limit(1);

    return NextResponse.json({
        isServiceKeySet,
        envVarLength,
        adminReadSuccess: !error,
        adminReadError: error ? error.message : null,
        dataSample: data
    });
}
