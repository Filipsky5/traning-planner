/**
 * Form view model for collecting single workout data during onboarding
 * Used in WorkoutOnboardingForm component
 */
export interface WorkoutOnboardingFormViewModel {
  distanceKm: string;
  duration: {
    hours: string;
    minutes: string;
    seconds: string;
  };
  avgHr: string;
  completedAt: Date;
}

/**
 * DTO for creating a completed workout via API
 * Matches createWorkoutSchema from /src/lib/validation/workouts.ts
 */
export interface CreateCompletedWorkoutDto {
  training_type_code: string;       // Default: 'easy'
  planned_date: string;             // YYYY-MM-DD format, same as completed_at
  position: number;                 // Default: 1
  planned_distance_m: number;       // Equal to distance_m
  planned_duration_s: number;       // Equal to duration_s
  steps: Array<{
    part: 'main';
    distance_m: number;
    duration_s: number;
  }>;
  status: 'completed';
  distance_m: number;               // From form (km * 1000)
  duration_s: number;               // From form (HH:MM:SS → seconds)
  avg_hr_bpm: number;               // From form
  completed_at: string;             // ISO format from form date
  rating: 'just_right';             // Default rating for onboarding workouts
}
