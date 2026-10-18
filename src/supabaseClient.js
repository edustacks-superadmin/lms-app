import { createClient } from '@supabase/supabase-js'
import capacitorStorage from './utils/capacitorStorage'

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c'

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: capacitorStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})

