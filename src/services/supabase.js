import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://rsnmvinozvkeoyruxlii.supabase.co"
const SUPABASE_KEY = "sb_publishable_b25YmM__ntPewmpBqXz2QA_b_BDuiPR"

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
