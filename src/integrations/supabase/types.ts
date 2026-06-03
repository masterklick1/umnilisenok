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
      achievements: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon: string
          id: string
          requirement_type: string
          requirement_value: number
          reward_stars: number
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          requirement_type: string
          requirement_value: number
          reward_stars?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          requirement_type?: string
          requirement_value?: number
          reward_stars?: number
          title?: string
        }
        Relationships: []
      }
      child_activity: {
        Row: {
          activity_type: string
          child_id: string
          created_at: string | null
          details: Json | null
          id: string
          page_path: string | null
        }
        Insert: {
          activity_type: string
          child_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          page_path?: string | null
        }
        Update: {
          activity_type?: string
          child_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          page_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_activity_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_analysis: {
        Row: {
          child_id: string
          id: string
          last_analyzed_at: string | null
          recommendations: string | null
          strengths: Json | null
          updated_at: string | null
          weaknesses: Json | null
        }
        Insert: {
          child_id: string
          id?: string
          last_analyzed_at?: string | null
          recommendations?: string | null
          strengths?: Json | null
          updated_at?: string | null
          weaknesses?: Json | null
        }
        Update: {
          child_id?: string
          id?: string
          last_analyzed_at?: string | null
          recommendations?: string | null
          strengths?: Json | null
          updated_at?: string | null
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "child_analysis_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_invites: {
        Row: {
          child_first_name: string
          child_id: string | null
          code: string
          created_at: string
          expires_at: string
          id: string
          parent_id: string
          used_at: string | null
        }
        Insert: {
          child_first_name: string
          child_id?: string | null
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          parent_id: string
          used_at?: string | null
        }
        Update: {
          child_first_name?: string
          child_id?: string | null
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          parent_id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      child_locations: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          child_id: string
          created_at: string
          id: string
          latitude: number
          longitude: number
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          child_id: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          child_id?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          category: string
          created_at: string | null
          id: string
          image_data: string
          title: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          image_data: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          image_data?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          child_id: string
          created_at: string | null
          current_turn: string | null
          game_state: Json
          game_type: string
          id: string
          parent_id: string
          status: string | null
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          current_turn?: string | null
          game_state: Json
          game_type: string
          id?: string
          parent_id: string
          status?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          current_turn?: string | null
          game_state?: Json
          game_type?: string
          id?: string
          parent_id?: string
          status?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_requests: {
        Row: {
          child_id: string
          created_at: string
          fulfilled_at: string | null
          id: string
          parent_id: string
          request_type: string
          result_data: Json | null
          result_path: string | null
          status: string
        }
        Insert: {
          child_id: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          parent_id: string
          request_type: string
          result_data?: Json | null
          result_path?: string | null
          status?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          parent_id?: string
          request_type?: string
          result_data?: Json | null
          result_path?: string | null
          status?: string
        }
        Relationships: []
      }
      parent_child_links: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_links_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          name: string
          price_stars: number
          species: string
        }
        Insert: {
          created_at?: string | null
          icon: string
          id?: string
          name: string
          price_stars?: number
          species: string
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          name?: string
          price_stars?: number
          species?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      room_items: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          height: number
          icon: string
          id: string
          name: string
          price_stars: number
          unlock_achievement_id: string | null
          width: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          height?: number
          icon: string
          id?: string
          name: string
          price_stars?: number
          unlock_achievement_id?: string | null
          width?: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          height?: number
          icon?: string
          id?: string
          name?: string
          price_stars?: number
          unlock_achievement_id?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_items_unlock_achievement_id_fkey"
            columns: ["unlock_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_alerts: {
        Row: {
          accuracy: number | null
          child_id: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          message: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          accuracy?: number | null
          child_id: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          accuracy?: number | null
          child_id?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pets: {
        Row: {
          adopted_at: string | null
          energy: number
          happiness: number
          hunger: number
          id: string
          last_fed_at: string | null
          last_played_at: string | null
          pet_id: string
          pet_name: string
          user_id: string
        }
        Insert: {
          adopted_at?: string | null
          energy?: number
          happiness?: number
          hunger?: number
          id?: string
          last_fed_at?: string | null
          last_played_at?: string | null
          pet_id: string
          pet_name: string
          user_id: string
        }
        Update: {
          adopted_at?: string | null
          energy?: number
          happiness?: number
          hunger?: number
          id?: string
          last_fed_at?: string | null
          last_played_at?: string | null
          pet_id?: string
          pet_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pets_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string | null
          daily_streak: number
          experience: number
          id: string
          last_activity_date: string | null
          level: number
          stars: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_streak?: number
          experience?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          stars?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_streak?: number
          experience?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          stars?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_room_items: {
        Row: {
          id: string
          is_placed: boolean | null
          item_id: string
          position_x: number | null
          position_y: number | null
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_placed?: boolean | null
          item_id: string
          position_x?: number | null
          position_y?: number | null
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_placed?: boolean | null
          item_id?: string
          position_x?: number | null
          position_y?: number | null
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_room_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "room_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_room_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_children_with_progress: {
        Args: { p_parent_id: string }
        Returns: {
          avatar_url: string
          child_id: string
          daily_streak: number
          experience: number
          first_name: string
          level: number
          stars: number
        }[]
      }
      get_invite_by_code: {
        Args: { p_code: string }
        Returns: {
          child_first_name: string
          expires_at: string
          parent_id: string
        }[]
      }
      link_parent_child: {
        Args: { p_child_id: string; p_parent_id: string }
        Returns: undefined
      }
      redeem_child_invite: {
        Args: { p_child_id: string; p_code: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "parent" | "child"
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
      user_role: ["parent", "child"],
    },
  },
} as const
