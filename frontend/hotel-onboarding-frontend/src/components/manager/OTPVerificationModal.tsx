/**
 * OTP Verification Modal
 * Email-based OTP verification for secure document access
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { documentAccessService } from '@/services/managerReviewService';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (sessionToken: string, expiresAt: string) => void;
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
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Request OTP when modal opens
  useEffect(() => {
    if (isOpen && step === 'request') {
      requestOTP();
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        setError('Verification code expired. Please request a new one.');
        setStep('request');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

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

  const verifyOTP = async () => {
    const otpCode = otp.join('');

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
        onVerified(data.session_token, data.expires_at);
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

    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const fullOtp = [...newOtp];
      fullOtp[5] = value;
      if (fullOtp.every(digit => digit !== '')) {
        setOtp(fullOtp);
        setTimeout(() => verifyOTP(), 100);
      }
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
      setTimeout(() => verifyOTP(), 100);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Verify Your Identity
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'request' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-600 mb-4">
                Sending verification code to:
              </p>
              <p className="font-semibold text-gray-900 mb-6">
                {managerEmail}
              </p>
              {loading && (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          )}

          {step === 'verify' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600 mb-2">
                  We sent a 6-digit code to:
                </p>
                <p className="font-semibold text-gray-900 mb-2">
                  {managerEmail}
                </p>
                <p className="text-sm text-gray-500">
                  To access documents for <strong>{employeeName}</strong>
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
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
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    disabled={loading}
                  />
                ))}
              </div>

              {/* Timer */}
              {timeRemaining > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Code expires in {formatTime(timeRemaining)}</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={verifyOTP}
                  disabled={loading || otp.some(d => !d)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                
                <button
                  onClick={requestOTP}
                  disabled={loading}
                  className="w-full text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-50"
                >
                  Resend Code
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Verified Successfully!
              </h3>
              <p className="text-gray-600">
                You now have access to view documents for 30 minutes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;

