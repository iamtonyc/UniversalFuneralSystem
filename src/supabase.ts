import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type AshesRecord = {
  id: string;
  storage_number: string;
  location: string;
  deceased_name: string;
  burial_register_number: string;
  renter_name: string;
  storage_start_date: string | null;
  retrieval_date: string | null;
  cremation_date: string | null;
  created_at: string;
};

export type AshesLocation = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};
