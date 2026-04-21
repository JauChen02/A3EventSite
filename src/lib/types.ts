export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SafetyIndicator = "positive" | "negative" | "mixed";

export type SafetyResponse = {
  id: string;
  session_code: string;
  original_observation: string | null;
  sanitised_summary: string;
  indicator: SafetyIndicator;
  safety_culture_action: string;
  reason: string;
  proposed_action_needed: boolean;
  proposed_action: string;
  discussion_question: string;
  privacy_reminder: string;
  themes: string[] | null;
  is_visible: boolean;
  is_pinned: boolean;
  created_at: string;
};

export type SafetyResponseInsert = {
  id?: string;
  session_code: string;
  original_observation?: string | null;
  sanitised_summary: string;
  indicator: SafetyIndicator;
  safety_culture_action: string;
  reason: string;
  proposed_action_needed?: boolean;
  proposed_action: string;
  discussion_question: string;
  privacy_reminder: string;
  themes?: string[] | null;
  is_visible?: boolean;
  is_pinned?: boolean;
  created_at?: string;
};

export type SafetyResponseUpdate = Partial<SafetyResponseInsert>;

export type PatternSummaryResponse = Pick<
  SafetyResponse,
  "indicator" | "themes"
>;

export type WallSafetyResponse = Pick<
  SafetyResponse,
  | "id"
  | "sanitised_summary"
  | "indicator"
  | "safety_culture_action"
  | "reason"
  | "discussion_question"
  | "themes"
  | "is_pinned"
>;

export type SafetyAnalysisResult = {
  sanitised_summary: string;
  indicator: SafetyIndicator;
  safety_culture_action: string;
  reason: string;
  proposed_action_needed: boolean;
  proposed_action: string;
  discussion_question: string;
  privacy_reminder: string;
  themes: string[];
};

export type Database = {
  public: {
    Tables: {
      safety_responses: {
        Row: SafetyResponse;
        Insert: SafetyResponseInsert;
        Update: SafetyResponseUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
