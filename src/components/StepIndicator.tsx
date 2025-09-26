import { Check } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  completed: boolean;
  current: boolean;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}

export const StepIndicator = ({ currentStep, totalSteps, stepTitles }: StepIndicatorProps) => {
  const steps: Step[] = stepTitles.map((title, index) => ({
    number: index + 1,
    title,
    completed: index + 1 < currentStep,
    current: index + 1 === currentStep,
  }));

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-12 h-12 rounded-full border-2 text-sm font-bold transition-all duration-300
                  ${step.completed 
                    ? 'bg-gradient-primary border-primary text-white shadow-elegant' 
                    : step.current 
                    ? 'bg-gradient-primary border-primary text-white shadow-glow' 
                    : 'border-border bg-background text-muted-foreground'
                  }
                `}
              >
                {step.completed ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              
              {/* Step Title */}
              <div className="ml-3 min-w-0">
                <p className={`text-sm font-medium ${step.current ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </p>
              </div>
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-4 h-0.5 bg-border">
                <div 
                  className={`h-full transition-all duration-300 ${
                    step.completed ? 'bg-gradient-primary' : 'bg-transparent'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};