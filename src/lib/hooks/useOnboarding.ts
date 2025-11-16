import { useState, useCallback } from "react";
import type { WorkoutOnboardingFormViewModel, CreateCompletedWorkoutDto } from "../../types/onboarding";
import type { ApiResponse } from "../../types";

interface UseOnboardingReturn {
  currentStep: number;
  isLoading: boolean;
  handleFormSubmit: (data: WorkoutOnboardingFormViewModel) => Promise<void>;
}

/**
 * Hook managing onboarding flow state and API interactions
 * Handles 3-step workout collection process
 */
export function useOnboarding(nextUrl: string): UseOnboardingReturn {
  const [currentStep, setCurrentStep] = useState(1);
  const [workouts, setWorkouts] = useState<CreateCompletedWorkoutDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Transform form ViewModel to API DTO
   */
  const transformToDto = useCallback((data: WorkoutOnboardingFormViewModel): CreateCompletedWorkoutDto => {
    // Convert km to meters
    const distanceM = parseFloat(data.distanceKm) * 1000;

    // Convert HH:MM:SS to seconds
    const hours = parseInt(data.duration.hours) || 0;
    const minutes = parseInt(data.duration.minutes) || 0;
    const seconds = parseInt(data.duration.seconds) || 0;
    const durationS = hours * 3600 + minutes * 60 + seconds;

    // Convert date to YYYY-MM-DD string
    const completedAtDate = data.completedAt.toISOString().split("T")[0];

    return {
      training_type_code: "easy", // Default for onboarding
      planned_date: completedAtDate, // Same as completed_at
      position: 1, // Default position
      planned_distance_m: distanceM, // Same as actual distance
      planned_duration_s: durationS, // Same as actual duration
      steps: [
        {
          part: "main",
          distance_m: distanceM,
          duration_s: durationS,
        },
      ],
      status: "completed",
      distance_m: distanceM,
      duration_s: durationS,
      avg_hr_bpm: parseInt(data.avgHr),
      completed_at: data.completedAt.toISOString(),
      rating: "just_right", // Default rating for onboarding
    };
  }, []);

  /**
   * Handle form submission for each step
   */
  const handleFormSubmit = useCallback(
    async (data: WorkoutOnboardingFormViewModel) => {
      // Transform to DTO
      const dto = transformToDto(data);

      // Add to workouts array
      const updatedWorkouts = [...workouts, dto];
      setWorkouts(updatedWorkouts);

      // If not the last step, move to next step
      if (currentStep < 3) {
        setCurrentStep((prev) => prev + 1);
        return;
      }

      // Last step - submit all workouts to API
      setIsLoading(true);

      try {
        // Send all 3 workouts in parallel
        const promises = updatedWorkouts.map((workout) =>
          fetch("/api/v1/workouts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(workout),
          })
        );

        const responses = await Promise.all(promises);

        // Check if all requests succeeded
        const failedResponse = responses.find((res) => !res.ok);
        if (failedResponse) {
          throw new Error(`Failed to save workout: ${failedResponse.status} ${failedResponse.statusText}`);
        }

        // Parse all responses
        const results = await Promise.all(responses.map((res) => res.json()));

        // Verify all responses are valid
        const failedResult = results.find((result) => !result.data);
        if (failedResult) {
          throw new Error("Invalid response from server");
        }

        // Success - redirect to next URL
        window.location.href = nextUrl;
      } catch (error) {
        setIsLoading(false);
        throw error; // Re-throw for parent to handle
      }
    },
    [currentStep, workouts, transformToDto, nextUrl]
  );

  return {
    currentStep,
    isLoading,
    handleFormSubmit,
  };
}
