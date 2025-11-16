import { toast } from "sonner";
import { Stepper } from "../onboarding/Stepper";
import { WorkoutOnboardingForm } from "../onboarding/WorkoutOnboardingForm";
import { Toaster } from "../ui/sonner";
import { useOnboarding } from "../../lib/hooks/useOnboarding";
import type { WorkoutOnboardingFormViewModel } from "../../types/onboarding";

interface OnboardingViewProps {
  nextUrl: string;
}

/**
 * Main onboarding view managing the 3-step workout collection process
 * Guides new users through adding their first 3 completed workouts
 */
export function OnboardingView({ nextUrl }: OnboardingViewProps) {
  const { currentStep, isLoading, handleFormSubmit: submitToApi } = useOnboarding(nextUrl);
  const totalSteps = 3;

  const handleFormSubmit = async (data: WorkoutOnboardingFormViewModel) => {
    try {
      await submitToApi(data);

      // Show success message only if not on last step (last step redirects)
      if (currentStep < 3) {
        toast.success(`Trening ${currentStep} zapisany!`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Nie udało się zapisać treningów. Spróbuj ponownie.";
      toast.error(errorMessage);
      console.error("Error submitting workout:", error);
    }
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gray-50 py-8 px-4" data-testid="onboarding-view">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-center mb-2">Witamy w Training Planner!</h1>
            <p className="text-center text-gray-600">
              Aby lepiej dostosować plan treningowy, powiedz nam o swoich ostatnich 3 treningach
            </p>
          </div>

          <Stepper currentStep={currentStep} totalSteps={totalSteps} />

          <h2 className="text-2xl font-semibold mb-6 text-center" data-testid="onboarding-step-title">
            Trening {currentStep} z {totalSteps}
          </h2>

          <WorkoutOnboardingForm
            key={currentStep}
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
            stepNumber={currentStep}
          />
        </div>
      </div>
    </>
  );
}
