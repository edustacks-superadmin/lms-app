import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ORG_CONFIG } from '../config/organization';

const supabaseUrl = ORG_CONFIG.supabase.url;
const supabaseKey = ORG_CONFIG.supabase.anonKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
