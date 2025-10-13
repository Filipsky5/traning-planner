export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      ai_logs: {
        Row: {
          cost_usd: number | null;
          created_at: string;
          event: string;
          id: string;
          input_tokens: number | null;
          latency_ms: number | null;
          level: string | null;
          model: string | null;
          output_tokens: number | null;
          payload: Json | null;
          provider: string | null;
          user_id: string;
        };
        Insert: {
          cost_usd?: number | null;
          created_at?: string;
          event: string;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          level?: string | null;
          model?: string | null;
          output_tokens?: number | null;
          payload?: Json | null;
          provider?: string | null;
          user_id: string;
        };
        Update: {
          cost_usd?: number | null;
          created_at?: string;
          event?: string;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          level?: string | null;
          model?: string | null;
          output_tokens?: number | null;
          payload?: Json | null;
          provider?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_suggestion_events: {
        Row: {
          ai_suggestion_id: string;
          id: string;
          kind: Database["public"]["Enums"]["ai_event_kind"];
          metadata: Json | null;
          occurred_at: string;
          user_id: string;
        };
        Insert: {
          ai_suggestion_id: string;
          id?: string;
          kind?: Database["public"]["Enums"]["ai_event_kind"];
          metadata?: Json | null;
          occurred_at?: string;
          user_id: string;
        };
        Update: {
          ai_suggestion_id?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["ai_event_kind"];
          metadata?: Json | null;
          occurred_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_suggestion_events_ai_suggestion_ownership_fk";
            columns: ["ai_suggestion_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "ai_suggestions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      ai_suggestions: {
        Row: {
          accepted_workout_id: string | null;
          created_at: string;
          id: string;
          status: Database["public"]["Enums"]["ai_suggestion_status"];
          steps_jsonb: Json;
          training_type_code: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accepted_workout_id?: string | null;
          created_at?: string;
          id?: string;
          status?: Database["public"]["Enums"]["ai_suggestion_status"];
          steps_jsonb: Json;
          training_type_code: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_workout_id?: string | null;
          created_at?: string;
          id?: string;
          status?: Database["public"]["Enums"]["ai_suggestion_status"];
          steps_jsonb?: Json;
          training_type_code?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_accepted_workout_ownership_fk";
            columns: ["accepted_workout_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "vw_last3_completed_overall";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "ai_suggestions_accepted_workout_ownership_fk";
            columns: ["accepted_workout_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "vw_last3_completed_per_type";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "ai_suggestions_accepted_workout_ownership_fk";
            columns: ["accepted_workout_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "ai_suggestions_training_type_code_fkey";
            columns: ["training_type_code"];
            isOneToOne: false;
            referencedRelation: "training_types";
            referencedColumns: ["code"];
          },
        ];
      };
      training_types: {
        Row: {
          code: string;
          created_at: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      user_goals: {
        Row: {
          created_at: string;
          due_date: string;
          goal_type: Database["public"]["Enums"]["goal_type"];
          id: string;
          notes: string | null;
          target_distance_m: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          due_date: string;
          goal_type?: Database["public"]["Enums"]["goal_type"];
          id?: string;
          notes?: string | null;
          target_distance_m: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          due_date?: string;
          goal_type?: Database["public"]["Enums"]["goal_type"];
          id?: string;
          notes?: string | null;
          target_distance_m?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          ai_suggestion_id: string | null;
          avg_hr_bpm: number | null;
          avg_pace_s_per_km: number | null;
          completed_at: string | null;
          created_at: string;
          distance_m: number | null;
          duration_s: number | null;
          id: string;
          origin: Database["public"]["Enums"]["workout_origin"];
          planned_date: string;
          planned_distance_m: number;
          planned_duration_s: number;
          position: number;
          rating: Database["public"]["Enums"]["workout_rating"] | null;
          status: Database["public"]["Enums"]["workout_status"];
          steps_jsonb: Json;
          training_type_code: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_suggestion_id?: string | null;
          avg_hr_bpm?: number | null;
          avg_pace_s_per_km?: number | null;
          completed_at?: string | null;
          created_at?: string;
          distance_m?: number | null;
          duration_s?: number | null;
          id?: string;
          origin?: Database["public"]["Enums"]["workout_origin"];
          planned_date: string;
          planned_distance_m: number;
          planned_duration_s: number;
          position: number;
          rating?: Database["public"]["Enums"]["workout_rating"] | null;
          status?: Database["public"]["Enums"]["workout_status"];
          steps_jsonb: Json;
          training_type_code: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_suggestion_id?: string | null;
          avg_hr_bpm?: number | null;
          avg_pace_s_per_km?: number | null;
          completed_at?: string | null;
          created_at?: string;
          distance_m?: number | null;
          duration_s?: number | null;
          id?: string;
          origin?: Database["public"]["Enums"]["workout_origin"];
          planned_date?: string;
          planned_distance_m?: number;
          planned_duration_s?: number;
          position?: number;
          rating?: Database["public"]["Enums"]["workout_rating"] | null;
          status?: Database["public"]["Enums"]["workout_status"];
          steps_jsonb?: Json;
          training_type_code?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workouts_ai_suggestion_ownership_fk";
            columns: ["ai_suggestion_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "ai_suggestions";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "workouts_training_type_code_fkey";
            columns: ["training_type_code"];
            isOneToOne: false;
            referencedRelation: "training_types";
            referencedColumns: ["code"];
          },
        ];
      };
    };
    Views: {
      vw_last3_completed_overall: {
        Row: {
          ai_suggestion_id: string | null;
          avg_hr_bpm: number | null;
          avg_pace_s_per_km: number | null;
          completed_at: string | null;
          created_at: string | null;
          distance_m: number | null;
          duration_s: number | null;
          id: string | null;
          origin: Database["public"]["Enums"]["workout_origin"] | null;
          planned_date: string | null;
          planned_distance_m: number | null;
          planned_duration_s: number | null;
          position: number | null;
          rating: Database["public"]["Enums"]["workout_rating"] | null;
          rn: number | null;
          status: Database["public"]["Enums"]["workout_status"] | null;
          steps_jsonb: Json | null;
          training_type_code: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workouts_ai_suggestion_ownership_fk";
            columns: ["ai_suggestion_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "ai_suggestions";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "workouts_training_type_code_fkey";
            columns: ["training_type_code"];
            isOneToOne: false;
            referencedRelation: "training_types";
            referencedColumns: ["code"];
          },
        ];
      };
      vw_last3_completed_per_type: {
        Row: {
          ai_suggestion_id: string | null;
          avg_hr_bpm: number | null;
          avg_pace_s_per_km: number | null;
          completed_at: string | null;
          created_at: string | null;
          distance_m: number | null;
          duration_s: number | null;
          id: string | null;
          origin: Database["public"]["Enums"]["workout_origin"] | null;
          planned_date: string | null;
          planned_distance_m: number | null;
          planned_duration_s: number | null;
          position: number | null;
          rating: Database["public"]["Enums"]["workout_rating"] | null;
          rn: number | null;
          status: Database["public"]["Enums"]["workout_status"] | null;
          steps_jsonb: Json | null;
          training_type_code: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workouts_ai_suggestion_ownership_fk";
            columns: ["ai_suggestion_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "ai_suggestions";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "workouts_training_type_code_fkey";
            columns: ["training_type_code"];
            isOneToOne: false;
            referencedRelation: "training_types";
            referencedColumns: ["code"];
          },
        ];
      };
    };
    Functions: Record<never, never>;
    Enums: {
      ai_event_kind: "regenerate";
      ai_suggestion_status: "shown" | "accepted" | "rejected" | "expired";
      goal_type: "distance_by_date";
      workout_origin: "manual" | "ai" | "import";
      workout_rating: "too_easy" | "just_right" | "too_hard";
      workout_status: "planned" | "completed" | "skipped" | "canceled";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_event_kind: ["regenerate"],
      ai_suggestion_status: ["shown", "accepted", "rejected", "expired"],
      goal_type: ["distance_by_date"],
      workout_origin: ["manual", "ai", "import"],
      workout_rating: ["too_easy", "just_right", "too_hard"],
      workout_status: ["planned", "completed", "skipped", "canceled"],
    },
  },
} as const;
