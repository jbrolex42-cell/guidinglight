// supabase.js — shared Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL  = 'https://efscwdgzzidplrbpqyjt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmc2N3ZGd6emlkcGxyYnBxeWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDEwMjQsImV4cCI6MjA5NDMxNzAyNH0.bcZ7cq6npozPd8x8z8AIvQfOAWyEKcLXCJvKSgmMZRg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
