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
      billing: {
        Row: {
          amount_paid: number
          amount_remaining: number
          commercial_registration: string | null
          contract_number: string | null
          course_package: string
          course_start_date: string
          created_at: string
          discount_percentage: number
          fee_after_discount: number
          first_payment: number | null
          id: string
          language: string
          level_count: number
          phone: string
          registration_date: string
          second_payment: number | null
          signature_url: string | null
          signed_pdf_url: string | null
          student_id: string
          student_name_ar: string
          student_name_en: string
          time_slot: string | null
          total_fee: number
          training_license: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          amount_remaining?: number
          commercial_registration?: string | null
          contract_number?: string | null
          course_package: string
          course_start_date: string
          created_at?: string
          discount_percentage?: number
          fee_after_discount?: number
          first_payment?: number | null
          id?: string
          language?: string
          level_count?: number
          phone: string
          registration_date?: string
          second_payment?: number | null
          signature_url?: string | null
          signed_pdf_url?: string | null
          student_id: string
          student_name_ar: string
          student_name_en: string
          time_slot?: string | null
          total_fee?: number
          training_license?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          amount_remaining?: number
          commercial_registration?: string | null
          contract_number?: string | null
          course_package?: string
          course_start_date?: string
          created_at?: string
          discount_percentage?: number
          fee_after_discount?: number
          first_payment?: number | null
          id?: string
          language?: string
          level_count?: number
          phone?: string
          registration_date?: string
          second_payment?: number | null
          signature_url?: string | null
          signed_pdf_url?: string | null
          student_id?: string
          student_name_ar?: string
          student_name_en?: string
          time_slot?: string | null
          total_fee?: number
          training_license?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_name: string
          course_name: string
          created_at: string
          id: string
          level: string | null
          teacher_id: string
          timing: string
          updated_at: string
        }
        Insert: {
          class_name: string
          course_name: string
          created_at?: string
          id?: string
          level?: string | null
          teacher_id: string
          timing: string
          updated_at?: string
        }
        Update: {
          class_name?: string
          course_name?: string
          created_at?: string
          id?: string
          level?: string | null
          teacher_id?: string
          timing?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      course_pricing: {
        Row: {
          created_at: string | null
          duration_months: number
          id: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_months: number
          id?: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_months?: number
          id?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      form_configurations: {
        Row: {
          config_key: string
          config_type: string
          config_value: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_type: string
          config_value: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_type?: string
          config_value?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          amount_paid: number | null
          amount_remaining: number | null
          branch: string | null
          class_type: string | null
          course_level: string | null
          courses_assigned: string | null
          created_at: string
          discount_percentage: number | null
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
          total_course_fee: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          amount_remaining?: number | null
          branch?: string | null
          class_type?: string | null
          course_level?: string | null
          courses_assigned?: string | null
          created_at?: string
          discount_percentage?: number | null
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
          total_course_fee?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          amount_remaining?: number | null
          branch?: string | null
          class_type?: string | null
          course_level?: string | null
          courses_assigned?: string | null
          created_at?: string
          discount_percentage?: number | null
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
          total_course_fee?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          grade: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          quiz_id: string
          score: number | null
          started_at: string
          student_id: string
          submitted_at: string | null
          teacher_feedback: string | null
          total_points: number | null
        }
        Insert: {
          grade?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          quiz_id: string
          score?: number | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
          teacher_feedback?: string | null
          total_points?: number | null
        }
        Update: {
          grade?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          quiz_id?: string
          score?: number | null
          started_at?: string
          student_id?: string
          submitted_at?: string | null
          teacher_feedback?: string | null
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
          points_awarded: number | null
          question_id: string
          selected_option_index: number | null
          teacher_feedback: string | null
          text_answer: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          question_id: string
          selected_option_index?: number | null
          teacher_feedback?: string | null
          text_answer?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          question_id?: string
          selected_option_index?: number | null
          teacher_feedback?: string | null
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
      student_teachers: {
        Row: {
          created_at: string
          id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_teachers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_weekly_reports: {
        Row: {
          attendance_rating: number | null
          course_name: string | null
          created_at: string | null
          current_grade: number | null
          exam_1_score: number | null
          exam_2_score: number | null
          exam_3_score: number | null
          exam_4_score: number | null
          expiration_date: string | null
          grammar_rating: number | null
          id: string
          level: string | null
          reading_rating: number | null
          registration_date: string | null
          report_date: string
          schedule: string | null
          speaking_rating: number | null
          student_id: string
          teacher_comments: string | null
          teacher_id: string
          teacher_name: string | null
          teacher_notes: string | null
          updated_at: string | null
          vocabulary_rating: number | null
          week_number: number
          writing_rating: number | null
        }
        Insert: {
          attendance_rating?: number | null
          course_name?: string | null
          created_at?: string | null
          current_grade?: number | null
          exam_1_score?: number | null
          exam_2_score?: number | null
          exam_3_score?: number | null
          exam_4_score?: number | null
          expiration_date?: string | null
          grammar_rating?: number | null
          id?: string
          level?: string | null
          reading_rating?: number | null
          registration_date?: string | null
          report_date?: string
          schedule?: string | null
          speaking_rating?: number | null
          student_id: string
          teacher_comments?: string | null
          teacher_id: string
          teacher_name?: string | null
          teacher_notes?: string | null
          updated_at?: string | null
          vocabulary_rating?: number | null
          week_number: number
          writing_rating?: number | null
        }
        Update: {
          attendance_rating?: number | null
          course_name?: string | null
          created_at?: string | null
          current_grade?: number | null
          exam_1_score?: number | null
          exam_2_score?: number | null
          exam_3_score?: number | null
          exam_4_score?: number | null
          expiration_date?: string | null
          grammar_rating?: number | null
          id?: string
          level?: string | null
          reading_rating?: number | null
          registration_date?: string | null
          report_date?: string
          schedule?: string | null
          speaking_rating?: number | null
          student_id?: string
          teacher_comments?: string | null
          teacher_id?: string
          teacher_name?: string | null
          teacher_notes?: string | null
          updated_at?: string | null
          vocabulary_rating?: number | null
          week_number?: number
          writing_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_weekly_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_weekly_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          amount_paid: number | null
          amount_remaining: number | null
          billing_id: string | null
          branch: string
          class_type: string
          course_duration_months: number | null
          course_level: string | null
          created_at: string
          discount_percentage: number | null
          email: string
          expiration_date: string | null
          full_name_ar: string
          full_name_en: string
          id: string
          national_id: string
          next_payment_date: string | null
          payment_method: string
          phone1: string
          phone2: string | null
          program: string
          registration_date: string | null
          stop_postpone_dates: string[] | null
          student_id: string | null
          subscription_status: string | null
          teacher_id: string | null
          timing: string | null
          total_course_fee: number | null
          total_grade: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          amount_remaining?: number | null
          billing_id?: string | null
          branch: string
          class_type: string
          course_duration_months?: number | null
          course_level?: string | null
          created_at?: string
          discount_percentage?: number | null
          email: string
          expiration_date?: string | null
          full_name_ar: string
          full_name_en: string
          id?: string
          national_id: string
          next_payment_date?: string | null
          payment_method: string
          phone1: string
          phone2?: string | null
          program: string
          registration_date?: string | null
          stop_postpone_dates?: string[] | null
          student_id?: string | null
          subscription_status?: string | null
          teacher_id?: string | null
          timing?: string | null
          total_course_fee?: number | null
          total_grade?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          amount_remaining?: number | null
          billing_id?: string | null
          branch?: string
          class_type?: string
          course_duration_months?: number | null
          course_level?: string | null
          created_at?: string
          discount_percentage?: number | null
          email?: string
          expiration_date?: string | null
          full_name_ar?: string
          full_name_en?: string
          id?: string
          national_id?: string
          next_payment_date?: string | null
          payment_method?: string
          phone1?: string
          phone2?: string | null
          program?: string
          registration_date?: string | null
          stop_postpone_dates?: string[] | null
          student_id?: string | null
          subscription_status?: string | null
          teacher_id?: string | null
          timing?: string | null
          total_course_fee?: number | null
          total_grade?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_schedules: {
        Row: {
          course_name: string
          created_at: string | null
          day_of_week: string
          id: string
          level: string | null
          teacher_id: string
          time_slot: string
          updated_at: string | null
        }
        Insert: {
          course_name: string
          created_at?: string | null
          day_of_week: string
          id?: string
          level?: string | null
          teacher_id: string
          time_slot: string
          updated_at?: string | null
        }
        Update: {
          course_name?: string
          created_at?: string | null
          day_of_week?: string
          id?: string
          level?: string | null
          teacher_id?: string
          time_slot?: string
          updated_at?: string | null
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
      generate_student_id: { Args: never; Returns: string }
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
