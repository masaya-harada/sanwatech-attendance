import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Staff = {
  id: string;
  name: string;
  pin: string;
  is_admin: boolean;
};

export type AttendanceLog = {
  id: string;
  staff_id: string;
  staff_name?: string;
  clock_in: string | null;
  clock_out: string | null;
  work_date: string;
};
