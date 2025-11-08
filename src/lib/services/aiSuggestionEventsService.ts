import type { SupabaseClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";

export interface RecordSuggestionEventParams {
  suggestionId: string;
  userId: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export async function recordSuggestionEvent(
  supabase: SupabaseClient,
  params: RecordSuggestionEventParams
): Promise<void> {
  const { suggestionId, userId, metadata, occurredAt } = params;

  const { error } = await supabase.from("ai_suggestion_events").insert({
    ai_suggestion_id: suggestionId,
    user_id: userId,
    kind: "regenerate" as Database["public"]["Enums"]["ai_event_kind"],
    metadata: metadata ?? null,
    occurred_at: occurredAt,
  });

  if (error) {
    console.warn("Failed to record AI suggestion regenerate event", {
      suggestionId,
      userId,
      error,
    });
  }
}

