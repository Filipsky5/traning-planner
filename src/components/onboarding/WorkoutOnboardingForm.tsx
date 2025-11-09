import { useState } from "react";
import type { WorkoutOnboardingFormViewModel } from "../../types/onboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DurationInput } from "./DurationInput";

interface WorkoutOnboardingFormProps {
  onSubmit: (data: WorkoutOnboardingFormViewModel) => void;
  isLoading: boolean;
  stepNumber: number;
}

/**
 * Form for entering a single workout's data during onboarding
 * Includes fields for distance, duration, heart rate, and date
 */
export function WorkoutOnboardingForm({
  onSubmit,
  isLoading,
  stepNumber,
}: WorkoutOnboardingFormProps) {
  // Form state
  const [distanceKm, setDistanceKm] = useState("");
  const [duration, setDuration] = useState({
    hours: "",
    minutes: "",
    seconds: "",
  });
  const [avgHr, setAvgHr] = useState("");
  const [completedAt, setCompletedAt] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<{
    distance?: string;
    duration?: string;
    avgHr?: string;
    completedAt?: string;
  }>({});

  // Validation function
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate distance (must be > 0.1 km)
    const distance = parseFloat(distanceKm);
    if (isNaN(distance) || distance < 0.1) {
      newErrors.distance = "Dystans musi być większy niż 0.1 km";
    }

    // Validate duration (must be > 60 seconds total)
    const hours = parseInt(duration.hours) || 0;
    const minutes = parseInt(duration.minutes) || 0;
    const seconds = parseInt(duration.seconds) || 0;
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    if (totalSeconds < 60) {
      newErrors.duration = "Czas trwania musi być dłuższy niż 60 sekund";
    }

    // Validate average heart rate (must be 40-220 bpm)
    const hr = parseInt(avgHr);
    if (isNaN(hr) || hr < 40 || hr > 220) {
      newErrors.avgHr = "Tętno musi być w zakresie 40-220 bpm";
    }

    // Validate date (must be in the past)
    if (!completedAt) {
      newErrors.completedAt = "Data treningu jest wymagana";
    } else {
      const selectedDate = new Date(completedAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        newErrors.completedAt = "Data treningu musi być z przeszłości";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validate()) {
      return;
    }

    // Transform data to ViewModel format
    const data: WorkoutOnboardingFormViewModel = {
      distanceKm,
      duration,
      avgHr,
      completedAt: new Date(completedAt),
    };

    // Call parent's onSubmit
    onSubmit(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dane treningu #{stepNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Distance */}
          <div className="space-y-2">
            <Label htmlFor="distance">
              Dystans (km) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="distance"
              type="number"
              step="0.1"
              value={distanceKm}
              onChange={(e) => {
                setDistanceKm(e.target.value);
                setErrors((prev) => ({ ...prev, distance: undefined }));
              }}
              disabled={isLoading}
              placeholder="np. 5.5"
              className={errors.distance ? "border-red-500" : ""}
            />
            {errors.distance && (
              <p className="text-sm text-red-600">{errors.distance}</p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>
              Czas trwania <span className="text-red-500">*</span>
            </Label>
            <DurationInput
              value={duration}
              onChange={(newDuration) => {
                setDuration(newDuration);
                setErrors((prev) => ({ ...prev, duration: undefined }));
              }}
              disabled={isLoading}
            />
            {errors.duration && (
              <p className="text-sm text-red-600">{errors.duration}</p>
            )}
          </div>

          {/* Average Heart Rate */}
          <div className="space-y-2">
            <Label htmlFor="avgHr">
              Średnie tętno (bpm) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="avgHr"
              type="number"
              value={avgHr}
              onChange={(e) => {
                setAvgHr(e.target.value);
                setErrors((prev) => ({ ...prev, avgHr: undefined }));
              }}
              disabled={isLoading}
              placeholder="np. 145"
              className={errors.avgHr ? "border-red-500" : ""}
            />
            {errors.avgHr && (
              <p className="text-sm text-red-600">{errors.avgHr}</p>
            )}
          </div>

          {/* Completed At */}
          <div className="space-y-2">
            <Label htmlFor="completedAt">
              Data treningu <span className="text-red-500">*</span>
            </Label>
            <Input
              id="completedAt"
              type="date"
              value={completedAt}
              onChange={(e) => {
                setCompletedAt(e.target.value);
                setErrors((prev) => ({ ...prev, completedAt: undefined }));
              }}
              disabled={isLoading}
              max={new Date().toISOString().split("T")[0]}
              className={errors.completedAt ? "border-red-500" : ""}
            />
            {errors.completedAt && (
              <p className="text-sm text-red-600">{errors.completedAt}</p>
            )}
          </div>

          {/* Submit button */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                {stepNumber === 3 ? "Zapisywanie..." : "Zapisywanie..."}
              </>
            ) : (
              <>{stepNumber === 3 ? "Zakończ" : "Dalej"}</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
