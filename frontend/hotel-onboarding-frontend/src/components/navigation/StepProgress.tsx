import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  currentSubStep?: number;
  totalSubSteps?: number;
  stepName: string;
  estimatedTime?: number; // in minutes
  completedSteps?: number[];
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  currentSubStep,
  totalSubSteps,
  stepName,
  estimatedTime,
  completedSteps = []
}) => {
  const progress = ((currentStep - 1) / totalSteps) * 100;
  const subProgress = currentSubStep && totalSubSteps
    ? ((currentSubStep - 1) / totalSubSteps) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6"
    >
      {/* Main Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Step {currentStep} of {totalSteps}
            </h3>
            <span className="text-gray-500">•</span>
            <span className="text-gray-700">{stepName}</span>
          </div>
          {estimatedTime && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>~{estimatedTime} min</span>
            </div>
          )}
        </div>

        {/* Desktop step indicators */}
        <div className="hidden md:flex items-center justify-between mb-4">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <React.Fragment key={step}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: step * 0.05 }}
                className="relative"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    completedSteps.includes(step)
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : step < currentStep
                      ? 'bg-blue-200 text-blue-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {completedSteps.includes(step) ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>
              </motion.div>
              {step < totalSteps && (
                <div className="flex-1 mx-2">
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: step < currentStep ? '100%' : '0%'
                      }}
                      transition={{ duration: 0.5, delay: step * 0.05 }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile progress bar */}
        <div className="md:hidden">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
            />
          </div>
          <div className="mt-2 text-sm text-gray-600 text-center">
            {Math.round(progress)}% Complete
          </div>
        </div>
      </div>

      {/* Sub-step Progress (if applicable) */}
      {totalSubSteps && totalSubSteps > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="pt-4 border-t border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Section {currentSubStep} of {totalSubSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(subProgress)}%
            </span>
          </div>

          {/* Sub-step dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSubSteps }, (_, i) => i + 1).map((subStep) => (
              <motion.div
                key={subStep}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + subStep * 0.05 }}
                className={`h-2 flex-1 rounded-full transition-all ${
                  subStep < (currentSubStep || 1)
                    ? 'bg-blue-600'
                    : subStep === currentSubStep
                    ? 'bg-blue-400'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StepProgress;