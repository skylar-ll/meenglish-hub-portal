export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          class_time: string | null
          created_at: string
          date: string
          id: string
          marked_at: string
          marked_by: string
          status: string
          student_id: string
          updated_at: string
          week_number: number | null
        }
        Insert: {
          class_time?: string | null
          created_at?: string
          date?: string
          id?: string
          marked_at?: string
          marked_by: string
          status: string
          student_id: string
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          class_time?: string | null
          created_at?: string
          date?: string
          id?: string
          marked_at?: string
          marked_by?: string
          status?: string
          student_id?: string
          updated_at?: string
          week_number?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string | null
          class_type: string | null
          course_level: string | null
          courses_assigned: string | null
          created_at: string
          full_name_ar: string | null
          full_name_en: string | null
          id: string
          national_id: string | null
          next_payment_date: string | null
          payment_method: string | null
          phone1: string | null
          phone2: string | null
          program: string | null
          student_count: number | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          branch?: string | null
          class_type?: string | null
          course_level?: string | null
          courses_assigned?: string | null
          created_at?: string
          full_name_ar?: string | null
          full_name_en?: string | null
          id: string
          national_id?: string | null
          next_payment_date?: string | null
          payment_method?: string | null
          phone1?: string | null
          phone2?: string | null
          program?: string | null
          student_count?: number | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string | null
          class_type?: string | null
          course_level?: string | null
          courses_assigned?: string | null
          created_at?: string
          full_name_ar?: string | null
          full_name_en?: string | null
          id?: string
          national_id?: string | null
          next_payment_date?: string | null
          payment_method?: string | null
          phone1?: string | null
          phone2?: string | null
          program?: string | null
          student_count?: number | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          id: string
          quiz_id: string
          score: number | null
          started_at: string
          student_id: string
          submitted_at: string | null
          total_points: number | null
        }
        Insert: {
          id?: string
          quiz_id: string
          score?: number | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
          total_points?: number | null
        }
        Update: {
          id?: string
          quiz_id?: string
          score?: number | null
          started_at?: string
          student_id?: string
          submitted_at?: string | null
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_question_options: {
        Row: {
          created_at: string
          id: string
          option_order: number
          option_text: string
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_order: number
          option_text: string
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_order?: number
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer_index: number | null
          created_at: string
          id: string
          media_url: string | null
          points: number
          question_order: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer_index?: number | null
          created_at?: string
          id?: string
          media_url?: string | null
          points?: number
          question_order: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Update: {
          correct_answer_index?: number | null
          created_at?: string
          id?: string
          media_url?: string | null
          points?: number
          question_order?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          teacher_id: string
          title: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          teacher_id: string
          title: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          teacher_id?: string
          title?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          question_id: string
          selected_option_index: number | null
          text_answer: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          question_id: string
          selected_option_index?: number | null
          text_answer?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          question_id?: string
          selected_option_index?: number | null
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          branch: string
          class_type: string
          course_level: string | null
          created_at: string
          email: string
          full_name_ar: string
          full_name_en: string
          id: string
          national_id: string
          next_payment_date: string | null
          payment_method: string
          phone1: string
          phone2: string | null
          program: string
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          branch: string
          class_type: string
          course_level?: string | null
          created_at?: string
          email: string
          full_name_ar: string
          full_name_en: string
          id?: string
          national_id: string
          next_payment_date?: string | null
          payment_method: string
          phone1: string
          phone2?: string | null
          program: string
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string
          class_type?: string
          course_level?: string | null
          created_at?: string
          email?: string
          full_name_ar?: string
          full_name_en?: string
          id?: string
          national_id?: string
          next_payment_date?: string | null
          payment_method?: string
          phone1?: string
          phone2?: string | null
          program?: string
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          courses_assigned: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          student_count: number | null
          updated_at: string
        }
        Insert: {
          courses_assigned?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          student_count?: number | null
          updated_at?: string
        }
        Update: {
          courses_assigned?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          student_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
