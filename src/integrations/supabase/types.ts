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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_usage_limits: {
        Row: {
          created_at: string
          generation_count: number
          id: string
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generation_count?: number
          id?: string
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generation_count?: number
          id?: string
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_preferences: {
        Row: {
          created_at: string
          id: string
          notification_settings: Json | null
          theme_preference: string | null
          updated_at: string
          user_id: string
          widget_layout: Json
        }
        Insert: {
          created_at?: string
          id?: string
          notification_settings?: Json | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
          widget_layout?: Json
        }
        Update: {
          created_at?: string
          id?: string
          notification_settings?: Json | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
          widget_layout?: Json
        }
        Relationships: []
      }
      events: {
        Row: {
          budget: number
          created_at: string
          date: string
          description: string | null
          id: string
          is_auto_generated: boolean | null
          location: string | null
          person_id: string | null
          person_name: string
          reminder_days: number | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          budget?: number
          created_at?: string
          date: string
          description?: string | null
          id?: string
          is_auto_generated?: boolean | null
          location?: string | null
          person_id?: string | null
          person_name: string
          reminder_days?: number | null
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          budget?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_auto_generated?: boolean | null
          location?: string | null
          person_id?: string | null
          person_name?: string
          reminder_days?: number | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          push_sent: boolean | null
          scheduled_for: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          push_sent?: boolean | null
          scheduled_for?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          push_sent?: boolean | null
          scheduled_for?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      persons: {
        Row: {
          address: string | null
          age_bucket: string | null
          age_months: number | null
          age_updated_at: string | null
          age_years: number | null
          avatar: string | null
          birthday: string
          budget: number
          created_at: string
          email: string | null
          gender: string | null
          id: string
          interests: string[] | null
          is_minor: boolean | null
          last_gift: string | null
          name: string
          next_birthday: string | null
          notes: string | null
          phone: string | null
          preferred_categories: string[] | null
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          age_bucket?: string | null
          age_months?: number | null
          age_updated_at?: string | null
          age_years?: number | null
          avatar?: string | null
          birthday: string
          budget?: number
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_minor?: boolean | null
          last_gift?: string | null
          name: string
          next_birthday?: string | null
          notes?: string | null
          phone?: string | null
          preferred_categories?: string[] | null
          relationship: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          age_bucket?: string | null
          age_months?: number | null
          age_updated_at?: string | null
          age_years?: number | null
          avatar?: string | null
          birthday?: string
          budget?: number
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_minor?: boolean | null
          last_gift?: string | null
          name?: string
          next_birthday?: string | null
          notes?: string | null
          phone?: string | null
          preferred_categories?: string[] | null
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upcoming_purchases: {
        Row: {
          ai_reasoning: string | null
          alternative_gifts: string[] | null
          budget: number
          confidence: number | null
          created_at: string
          days_until: number
          event_id: string | null
          event_title: string
          id: string
          person_id: string | null
          person_name: string
          status: string
          suggested_gift: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          alternative_gifts?: string[] | null
          budget?: number
          confidence?: number | null
          created_at?: string
          days_until: number
          event_id?: string | null
          event_title: string
          id?: string
          person_id?: string | null
          person_name: string
          status?: string
          suggested_gift: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          alternative_gifts?: string[] | null
          budget?: number
          confidence?: number | null
          created_at?: string
          days_until?: number
          event_id?: string | null
          event_title?: string
          id?: string
          person_id?: string | null
          person_name?: string
          status?: string
          suggested_gift?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upcoming_purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upcoming_purchases_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_increment_ai_usage: {
        Args: { p_user_id: string }
        Returns: Json
      }
      compute_age_fields: {
        Args: { bdate: string; today?: string }
        Returns: {
          out_age_bucket: string
          out_age_months: number
          out_age_years: number
          out_is_minor: boolean
          out_next_birthday: string
        }[]
      }
      get_user_email: {
        Args: { user_uuid: string }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      refresh_birthdays_for_today: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin" | "free" | "premium_1" | "premium_2"
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
      user_role: ["admin", "free", "premium_1", "premium_2"],
    },
  },
} as const
