// Temporary type declarations to satisfy the Supabase client import.
// This file can be replaced by an auto-generated types file later.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          branch: string;
          next_payment_date: string | null;
          created_at: string;
          updated_at: string;
          payment_method: string;
          subscription_status: string | null;
          full_name_ar: string;
          full_name_en: string;
          phone1: string;
          phone2: string | null;
          email: string;
          national_id: string;
          program: string;
          class_type: string;
          course_level: string | null;
        };
        Insert: {
          id?: string;
          branch: string;
          next_payment_date?: string | null;
          created_at?: string;
          updated_at?: string;
          payment_method: string;
          subscription_status?: string | null;
          full_name_ar: string;
          full_name_en: string;
          phone1: string;
          phone2?: string | null;
          email: string;
          national_id: string;
          program: string;
          class_type: string;
          course_level?: string | null;
        };
        Update: {
          id?: string;
          branch?: string;
          next_payment_date?: string | null;
          created_at?: string;
          updated_at?: string;
          payment_method?: string;
          subscription_status?: string | null;
          full_name_ar?: string;
          full_name_en?: string;
          phone1?: string;
          phone2?: string | null;
          email?: string;
          national_id?: string;
          program?: string;
          class_type?: string;
          course_level?: string | null;
        };
      };
      teachers: {
        Row: {
          id: string;
          student_count: number | null;
          created_at: string;
          updated_at: string;
          email: string;
          phone: string | null;
          password_hash: string | null;
          courses_assigned: string | null;
          full_name: string;
        };
        Insert: {
          id?: string;
          student_count?: number | null;
          created_at?: string;
          updated_at?: string;
          email: string;
          phone?: string | null;
          password_hash?: string | null;
          courses_assigned?: string | null;
          full_name: string;
        };
        Update: {
          id?: string;
          student_count?: number | null;
          created_at?: string;
          updated_at?: string;
          email?: string;
          phone?: string | null;
          password_hash?: string | null;
          courses_assigned?: string | null;
          full_name?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
