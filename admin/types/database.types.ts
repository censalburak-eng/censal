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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          free_mode: boolean
          id: number
          price_monthly: number
          price_pin_24h: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          free_mode?: boolean
          id?: number
          price_monthly?: number
          price_pin_24h?: number
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          free_mode?: boolean
          id?: number
          price_monthly?: number
          price_pin_24h?: number
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      ban_appeals: {
        Row: {
          admin_reply: string | null
          appeal_count: number
          ban_reason: string | null
          created_at: string | null
          id: string
          message: string
          status: string
          updated_at: string | null
          user_id: string
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          admin_reply?: string | null
          appeal_count?: number
          ban_reason?: string | null
          created_at?: string | null
          id?: string
          message: string
          status?: string
          updated_at?: string | null
          user_id: string
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          admin_reply?: string | null
          appeal_count?: number
          ban_reason?: string | null
          created_at?: string | null
          id?: string
          message?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      banned_words: {
        Row: {
          word: string
        }
        Insert: {
          word: string
        }
        Update: {
          word?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id?: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          id: number
          max_pinned_limit: number
          name: string
          plate: number | null
        }
        Insert: {
          id: number
          max_pinned_limit?: number
          name: string
          plate?: number | null
        }
        Update: {
          id?: number
          max_pinned_limit?: number
          name?: string
          plate?: number | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          duration_sec: number | null
          id: string
          is_deleted: boolean
          lat: number | null
          lng: number | null
          media_key: string | null
          read_at: string | null
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          duration_sec?: number | null
          id?: string
          is_deleted?: boolean
          lat?: number | null
          lng?: number | null
          media_key?: string | null
          read_at?: string | null
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          duration_sec?: number | null
          id?: string
          is_deleted?: boolean
          lat?: number | null
          lng?: number | null
          media_key?: string | null
          read_at?: string | null
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          caption: string | null
          city_id: number
          created_at: string
          duration_sec: number | null
          edited_at: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean | null
          lat: number | null
          lng: number | null
          media_key: string | null
          reply_to: string | null
          type: Database["public"]["Enums"]["message_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          caption?: string | null
          city_id: number
          created_at?: string
          duration_sec?: number | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean | null
          lat?: number | null
          lng?: number | null
          media_key?: string | null
          reply_to?: string | null
          type: Database["public"]["Enums"]["message_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          caption?: string | null
          city_id?: number
          created_at?: string
          duration_sec?: number | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean | null
          lat?: number | null
          lng?: number | null
          media_key?: string | null
          reply_to?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_quotas_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_listings: {
        Row: {
          city_id: number
          created_at: string
          expires_at: string | null
          id: string
          message_id: string
          starts_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          city_id: number
          created_at?: string
          expires_at?: string | null
          id?: string
          message_id: string
          starts_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          city_id?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          message_id?: string
          starts_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_listings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_listings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_quotas_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_listings_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          city_id: string
          created_at: string | null
          first_name: string
          hide_phone: boolean
          id: string
          is_banned: boolean | null
          last_name: string
          phone: string | null
          role: string | null
          last_seen_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          city_id: string
          created_at?: string | null
          first_name: string
          hide_phone?: boolean
          id: string
          is_banned?: boolean | null
          last_name: string
          phone?: string | null
          role?: string | null
          last_seen_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          city_id?: string
          created_at?: string | null
          first_name?: string
          hide_phone?: boolean
          id?: string
          is_banned?: boolean | null
          last_name?: string
          phone?: string | null
          role?: string | null
          last_seen_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          conversation_id: string | null
          created_at: string
          details: string | null
          id: string
          message_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          room_id: number | null
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id?: string
          room_id?: number | null
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          room_id?: number | null
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          plan: string
          source: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          plan: string
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          plan?: string
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_logs_view: {
        Row: {
          action: string | null
          admin_email: string | null
          admin_first_name: string | null
          admin_id: string | null
          admin_last_name: string | null
          created_at: string | null
          details: Json | null
          id: string | null
          ip_address: string | null
          target_avatar_url: string | null
          target_city_id: string | null
          target_first_name: string | null
          target_id: string | null
          target_last_name: string | null
          target_phone: string | null
          target_type: string | null
        }
        Relationships: []
      }
      city_quotas_view: {
        Row: {
          active_pins_count: number | null
          id: number | null
          max_pinned_limit: number | null
          name: string | null
          plate: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          city_id: string | null
          created_at: string | null
          first_name: string | null
          hide_phone: boolean | null
          id: string | null
          last_name: string | null
          phone: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_pin: { Args: { p_pin_id: string }; Returns: undefined }
      filter_banned_words: { Args: { p_text: string }; Returns: string }
      get_callable_phone: { Args: { p_user_id: string }; Returns: string }
      get_or_create_conversation: { Args: { p_other: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_blocked: { Args: { a: string; b: string }; Returns: boolean }
      mark_conversation_as_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      reserve_pin: {
        Args: { p_city_id: number; p_message_id: string }
        Returns: Json
      }
      touch_last_seen: { Args: never; Returns: string }
      delete_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      submit_ban_appeal: { Args: { p_message: string }; Returns: Json }
    }
    Enums: {
      message_type: "text" | "image" | "audio" | "location"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      message_type: ["text", "image", "audio", "location"],
    },
  },
} as const
