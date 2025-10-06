import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { SignatureData } from '../../types/i9ManagerReview';

interface SignaturePadModalProps {
  onComplete: (signature: SignatureData) => void;
  onClose: () => void;
  title?: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  onComplete,
  onClose,
  title = 'Sign Document'
}) => {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [ipAddress, setIpAddress] = useState<string>('');

  useEffect(() => {
    // Get IP address
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Unknown'));
  }, []);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
  };

  const handleEnd = () => {
    setIsEmpty(sigPadRef.current?.isEmpty() || false);
  };

  const handleComplete = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const dataUrl = sigPadRef.current.toDataURL('image/png');
      
      const signatureData: SignatureData = {
        dataUrl,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent: navigator.userAgent
      };
      
      onComplete(signatureData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Sign using your mouse, trackpad, or touchscreen
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Signature Canvas */}
        <div className="p-6">
          <div className="border-2 border-gray-300 rounded-lg bg-white">
            <SignatureCanvas
              ref={sigPadRef}
              canvasProps={{
                className: 'w-full h-64 cursor-crosshair',
                style: { touchAction: 'none' }
              }}
              onEnd={handleEnd}
              backgroundColor="rgb(255, 255, 255)"
              penColor="rgb(0, 0, 0)"
              minWidth={1}
              maxWidth={2.5}
              velocityFilterWeight={0.7}
            />
          </div>

          {/* Instructions */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Instructions:</strong> Draw your signature in the box above. 
              Your signature will be captured along with the date, time, and IP address 
              for federal compliance and audit purposes.
            </p>
          </div>

          {/* Metadata Preview */}
          <div className="mt-4 text-xs text-gray-600 space-y-1">
            <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
            <p><strong>IP Address:</strong> {ipAddress || 'Loading...'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={isEmpty}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="h-4 w-4" />
              Confirm Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

