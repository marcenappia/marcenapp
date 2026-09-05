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
      ai_rate_limits: {
        Row: {
          count: number
          fn: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          fn: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          fn?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          budget: string | null
          created_at: string
          id: string
          image_url: string | null
          metadata: Json | null
          project_id: string | null
          sender: string
          text: string | null
          user_id: string
        }
        Insert: {
          budget?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          project_id?: string | null
          sender?: string
          text?: string | null
          user_id: string
        }
        Update: {
          budget?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          project_id?: string | null
          sender?: string
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_clauses: {
        Row: {
          clause_text: string
          created_at: string
          id: string
          prompt: string | null
          user_id: string
        }
        Insert: {
          clause_text: string
          created_at?: string
          id?: string
          prompt?: string | null
          user_id: string
        }
        Update: {
          clause_text?: string
          created_at?: string
          id?: string
          prompt?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          prompt: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          prompt?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          prompt?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orchestrator_runs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          plan: Json | null
          results: Json | null
          status: string
          updated_at: string
          used_fallback: boolean
          user_id: string
          user_prompt: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          plan?: Json | null
          results?: Json | null
          status?: string
          updated_at?: string
          used_fallback?: boolean
          user_id: string
          user_prompt: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          plan?: Json | null
          results?: Json | null
          status?: string
          updated_at?: string
          used_fallback?: boolean
          user_id?: string
          user_prompt?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          id: string
          name: string
          onboarding_completed: string[] | null
          onboarding_step: number | null
          phone: string | null
          reduce_motion: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          id?: string
          name?: string
          onboarding_completed?: string[] | null
          onboarding_step?: number | null
          phone?: string | null
          reduce_motion?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          id?: string
          name?: string
          onboarding_completed?: string[] | null
          onboarding_step?: number | null
          phone?: string | null
          reduce_motion?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          back_material: string | null
          cliente_id: string | null
          created_at: string
          depth: number | null
          doors: number | null
          drawers: number | null
          external_material: string | null
          handle_type: string | null
          height: number | null
          id: string
          internal_material: string | null
          labor_rate: number | null
          modules: number | null
          name: string
          nome: string | null
          profit_margin: number | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          back_material?: string | null
          cliente_id?: string | null
          created_at?: string
          depth?: number | null
          doors?: number | null
          drawers?: number | null
          external_material?: string | null
          handle_type?: string | null
          height?: number | null
          id?: string
          internal_material?: string | null
          labor_rate?: number | null
          modules?: number | null
          name?: string
          nome?: string | null
          profit_margin?: number | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          back_material?: string | null
          cliente_id?: string | null
          created_at?: string
          depth?: number | null
          doors?: number | null
          drawers?: number | null
          external_material?: string | null
          handle_type?: string | null
          height?: number | null
          id?: string
          internal_material?: string | null
          labor_rate?: number | null
          modules?: number | null
          name?: string
          nome?: string | null
          profit_margin?: number | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
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
      consume_ai_rate_limit: {
        Args: {
          _fn: string
          _limit: number
          _user_id: string
          _window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "editor" | "viewer"
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
      app_role: ["admin", "owner", "editor", "viewer"],
    },
  },
} as const
