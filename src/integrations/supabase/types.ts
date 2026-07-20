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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      experiment_stimuli: {
        Row: {
          alt_text: string
          created_at: string
          display_duration_seconds: number | null
          experiment_id: string
          id: string
          image_path: string
          image_url: string
          position: number
          updated_at: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          display_duration_seconds?: number | null
          experiment_id: string
          id?: string
          image_path: string
          image_url: string
          position: number
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          display_duration_seconds?: number | null
          experiment_id?: string
          id?: string
          image_path?: string
          image_url?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_stimuli_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "perception_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_objects: {
        Row: {
          category: string
          checksum: string
          created_at: string
          id: string
          keywords: string[]
          path: string
          status: string
          summary: string
          tags: string[]
          title: string
          type: string
          updated_at: string
          version: string
        }
        Insert: {
          category: string
          checksum?: string
          created_at?: string
          id?: string
          keywords?: string[]
          path?: string
          status: string
          summary?: string
          tags?: string[]
          title: string
          type: string
          updated_at?: string
          version?: string
        }
        Update: {
          category?: string
          checksum?: string
          created_at?: string
          id?: string
          keywords?: string[]
          path?: string
          status?: string
          summary?: string
          tags?: string[]
          title?: string
          type?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      participant_sessions: {
        Row: {
          completed_at: string | null
          consent_accepted_at: string | null
          created_at: string
          experiment_id: string
          id: string
          metadata: Json
          participant_alias: string | null
          public_token: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          consent_accepted_at?: string | null
          created_at?: string
          experiment_id: string
          id?: string
          metadata?: Json
          participant_alias?: string | null
          public_token: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          consent_accepted_at?: string | null
          created_at?: string
          experiment_id?: string
          id?: string
          metadata?: Json
          participant_alias?: string | null
          public_token?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_sessions_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "perception_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      perception_experiments: {
        Row: {
          created_at: string
          description: string
          hidden_target: string
          id: string
          instructions: string
          owner_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          hidden_target: string
          id?: string
          instructions?: string
          owner_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          hidden_target?: string
          id?: string
          instructions?: string
          owner_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          confidence: number | null
          created_at: string
          description: string | null
          id: string
          provenance: string | null
          resolved: boolean
          source_object_id: string
          target_object_id: string
          type: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          id?: string
          provenance?: string | null
          resolved?: boolean
          source_object_id: string
          target_object_id: string
          type: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          id?: string
          provenance?: string | null
          resolved?: boolean
          source_object_id?: string
          target_object_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_source_object_id_fkey"
            columns: ["source_object_id"]
            isOneToOne: false
            referencedRelation: "knowledge_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_target_object_id_fkey"
            columns: ["target_object_id"]
            isOneToOne: false
            referencedRelation: "knowledge_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      stimulus_responses: {
        Row: {
          attention: string
          confidence: number | null
          created_at: string
          discovered_hidden_element: boolean
          discovered_text: string | null
          feeling: string
          first_viewed_at: string | null
          id: string
          interpretation: string
          metadata: Json
          observation: string
          response_time_ms: number | null
          session_id: string
          stimulus_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          attention?: string
          confidence?: number | null
          created_at?: string
          discovered_hidden_element?: boolean
          discovered_text?: string | null
          feeling?: string
          first_viewed_at?: string | null
          id?: string
          interpretation?: string
          metadata?: Json
          observation?: string
          response_time_ms?: number | null
          session_id: string
          stimulus_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          attention?: string
          confidence?: number | null
          created_at?: string
          discovered_hidden_element?: boolean
          discovered_text?: string | null
          feeling?: string
          first_viewed_at?: string | null
          id?: string
          interpretation?: string
          metadata?: Json
          observation?: string
          response_time_ms?: number | null
          session_id?: string
          stimulus_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stimulus_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stimulus_responses_stimulus_id_fkey"
            columns: ["stimulus_id"]
            isOneToOne: false
            referencedRelation: "experiment_stimuli"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          logo_path: string | null
          logo_visible: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          logo_path?: string | null
          logo_visible?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          logo_path?: string | null
          logo_visible?: boolean
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
      user_owns_experiment: {
        Args: { _experiment_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "researcher"
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
      app_role: ["owner", "admin", "researcher"],
    },
  },
} as const
