interface StepperProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Visual progress indicator showing current step in the onboarding process
 */
export function Stepper({ currentStep, totalSteps }: StepperProps) {
  return (
    <div className="flex items-center justify-center mb-8" data-testid="onboarding-stepper">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;

        return (
          <div key={stepNumber} className="flex items-center">
            {/* Step circle */}
            <div
              data-testid={`onboarding-step-${stepNumber}`}
              className={`
                flex items-center justify-center
                w-10 h-10 rounded-full font-semibold
                transition-colors duration-200
                ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-600"
                }
              `}
            >
              {isCompleted ? "✓" : stepNumber}
            </div>

            {/* Connector line (except after last step) */}
            {stepNumber < totalSteps && (
              <div
                className={`
                  w-16 h-1 mx-2
                  transition-colors duration-200
                  ${isCompleted ? "bg-green-500" : "bg-gray-300"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
