/**
 * OTP Verification Modal
 * Email-based OTP verification for secure document access
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { documentAccessService } from '@/services/managerReviewService';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (sessionToken: string) => void;
  employeeId: string;
  employeeName: string;
  managerEmail: string;
}

export const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  employeeId,
  employeeName,
  managerEmail
}) => {
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setExpiresAt] = useState<string | null>(null);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Request OTP when modal opens
  useEffect(() => {
    if (isOpen && step === 'request') {
      requestOTP();
    }
  }, [isOpen]);

  const requestOTP = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await documentAccessService.requestOTP(employeeId);

      setExpiresAt(data.expires_at);
      setStep('verify');

      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);

    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (otpArray?: string[]) => {
    // Use provided OTP array or current state
    const otpToVerify = otpArray || otp;
    const otpCode = otpToVerify.join('');

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await documentAccessService.verifyOTP(employeeId, otpCode);

      setStep('success');

      // Call onVerified after a brief delay to show success message
      setTimeout(() => {
        onVerified(data.session_token);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered - pass newOtp directly
    if (newOtp.every(digit => digit !== '')) {
      setTimeout(() => verifyOTP(newOtp), 300);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      // Pass digits array directly to verifyOTP
      setTimeout(() => verifyOTP(digits), 300);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-[clamp(1rem,3vw,1.5rem)]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-[clamp(1rem,3vw,1.5rem)] border-b">
          <h2 className="text-[clamp(1.125rem,3vw,1.25rem)] font-semibold text-gray-900">
            Verify Your Identity
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-[clamp(1.25rem,3vw,1.5rem)] h-[clamp(1.25rem,3vw,1.5rem)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-[clamp(1rem,3vw,1.5rem)]">
          {step === 'request' && (
            <div className="text-center">
              <div className="w-[clamp(4rem,10vw,5rem)] h-[clamp(4rem,10vw,5rem)] bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-[clamp(1rem,3vw,1.5rem)]">
                <Mail className="w-[clamp(2rem,5vw,2.5rem)] h-[clamp(2rem,5vw,2.5rem)] text-blue-600" />
              </div>
              <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600 mb-[clamp(1rem,3vw,1.5rem)]">
                Sending verification code to:
              </p>
              <p className="font-semibold text-[clamp(1rem,2.5vw,1.125rem)] text-gray-900 mb-[clamp(1.5rem,4vw,2rem)]">
                {managerEmail}
              </p>
              {loading && (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-[clamp(2rem,5vw,2.5rem)] w-[clamp(2rem,5vw,2.5rem)] border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          )}

          {step === 'verify' && (
            <div>
              <div className="text-center mb-[clamp(1.5rem,4vw,2rem)]">
                <div className="w-[clamp(4rem,10vw,5rem)] h-[clamp(4rem,10vw,5rem)] bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-[clamp(1rem,3vw,1.5rem)]">
                  <Mail className="w-[clamp(2rem,5vw,2.5rem)] h-[clamp(2rem,5vw,2.5rem)] text-blue-600" />
                </div>
                <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600 mb-[clamp(0.5rem,1.5vw,0.75rem)]">
                  We sent a 6-digit code to:
                </p>
                <p className="font-semibold text-[clamp(1rem,2.5vw,1.125rem)] text-gray-900 mb-[clamp(0.5rem,1.5vw,0.75rem)]">
                  {managerEmail}
                </p>
                <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500">
                  To access documents for <strong>{employeeName}</strong>
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-[clamp(0.375rem,1.5vw,0.5rem)] mb-[clamp(1.5rem,4vw,2rem)]" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-[clamp(2.5rem,8vw,3rem)] h-[clamp(3rem,10vw,3.5rem)] text-center text-[clamp(1.25rem,4vw,1.5rem)] font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    disabled={loading}
                  />
                ))}
              </div>

              {/* Loading Indicator */}
              {loading && (
                <div className="flex items-center justify-center gap-[clamp(0.5rem,1.5vw,0.75rem)] p-[clamp(0.75rem,2vw,1rem)] bg-blue-50 border border-blue-200 rounded-lg mb-[clamp(1rem,3vw,1.5rem)]">
                  <div className="animate-spin rounded-full h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] border-b-2 border-blue-600"></div>
                  <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-blue-800 font-medium">Verifying...</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] p-[clamp(0.75rem,2vw,1rem)] bg-red-50 border border-red-200 rounded-lg mb-[clamp(1rem,3vw,1.5rem)]">
                  <AlertCircle className="w-[clamp(1.25rem,3vw,1.5rem)] h-[clamp(1.25rem,3vw,1.5rem)] text-red-600 flex-shrink-0" />
                  <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-red-800">{error}</p>
                </div>
              )}

              {/* Helper Text */}
              <div className="text-center mb-[clamp(1rem,3vw,1.5rem)]">
                <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500">
                  {loading ? 'Please wait...' : 'Enter the code to verify your identity'}
                </p>
              </div>

              {/* Resend Button */}
              <button
                onClick={requestOTP}
                disabled={loading}
                className="w-full text-blue-600 py-[clamp(0.5rem,1.5vw,0.75rem)] rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed text-[clamp(0.875rem,2.5vw,1rem)]"
              >
                Resend Code
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="w-[clamp(4rem,10vw,5rem)] h-[clamp(4rem,10vw,5rem)] bg-green-100 rounded-full flex items-center justify-center mx-auto mb-[clamp(1rem,3vw,1.5rem)]">
                <CheckCircle className="w-[clamp(2rem,5vw,2.5rem)] h-[clamp(2rem,5vw,2.5rem)] text-green-600" />
              </div>
              <h3 className="text-[clamp(1.125rem,3vw,1.25rem)] font-semibold text-gray-900 mb-[clamp(0.5rem,1.5vw,0.75rem)]">
                Verified Successfully!
              </h3>
              <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">
                Loading documents...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;

