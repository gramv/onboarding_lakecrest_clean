import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UnifiedNavigationProps {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onSave?: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
  nextLabel?: string;
  backLabel?: string;
  progress: number;
}

export const UnifiedNavigation: React.FC<UnifiedNavigationProps> = ({
  currentStep,
  totalSteps,
  stepName,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onSave,
  isLoading = false,
  isSaving = false,
  nextLabel,
  backLabel,
  progress
}) => {
  const { t } = useTranslation();

  // Mobile bottom navigation
  const MobileNav = () => (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 md:hidden z-50 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          disabled={!canGoBack || isLoading}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all min-w-[100px] ${
            canGoBack
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{backLabel || t('navigation.back')}</span>
        </motion.button>

        {onSave && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onSave}
            disabled={isLoading || isSaving}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-all"
          >
            {isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-green-700 border-t-transparent rounded-full"
              />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{t('navigation.save')}</span>
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          disabled={!canGoNext || isLoading}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all min-w-[100px] ${
            canGoNext
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span>{nextLabel || t('navigation.next')}</span>
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Progress indicator */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{stepName}</span>
          <span>{currentStep} / {totalSteps}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-blue-600 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );

  // Desktop navigation
  const DesktopNav = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="hidden md:block bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40 shadow-sm"
    >
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb and progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Step {currentStep} of {totalSteps}</span>
            <span className="text-gray-400">•</span>
            <span className="font-medium text-gray-900">{stepName}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-blue-600 rounded-full"
                />
              </div>
            </div>
            <span className="text-sm text-gray-600">{Math.round(progress)}% Complete</span>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            disabled={!canGoBack || isLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
              canGoBack
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{backLabel || t('navigation.back')}</span>
          </motion.button>

          <div className="flex items-center gap-3">
            {onSave && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSave}
                disabled={isLoading || isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-all"
              >
                {isSaving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-green-700 border-t-transparent rounded-full"
                  />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>{t('navigation.save')}</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNext}
              disabled={!canGoNext || isLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                canGoNext
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>{nextLabel || t('navigation.next')}</span>
              {canGoNext && <ChevronRight className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <DesktopNav />
      <MobileNav />
    </>
  );
};

export default UnifiedNavigation;