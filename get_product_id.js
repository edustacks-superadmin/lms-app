
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getProductId() {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .limit(1)
  
  if (error) {
    console.error('Error fetching product:', error)
  } else {
    console.log('Product ID:', data[0]?.id)
  }
}

getProductId()
