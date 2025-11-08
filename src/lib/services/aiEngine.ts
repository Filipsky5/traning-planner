import type { AiSuggestionCreateCommand, WorkoutStepDto } from "../../types";

export interface AiGeneratedSuggestion {
  steps: WorkoutStepDto[];
  metadata?: Record<string, unknown>;
}

export async function generateSuggestion(
  _userId: string,
  _input: AiSuggestionCreateCommand
): Promise<AiGeneratedSuggestion> {
  return {
    steps: [
      {
        part: "warmup",
        duration_s: 600,
        notes: "Lekki trucht na rozgrzewkę",
      },
      {
        part: "main",
        distance_m: 5000,
        notes: "Bieg w tempie konwersacyjnym",
      },
      {
        part: "cooldown",
        duration_s: 300,
        notes: "Marsz i rozciąganie",
      },
    ],
    metadata: {
      placeholder: true,
      generatedAt: new Date().toISOString(),
    },
  };
}
