import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Download, Maximize2 } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl }) => {
  const [zoom, setZoom] = useState(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'i9_form.pdf';
    link.click();
  };

  const handleFullScreen = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">I-9 Form (Section 1 + List A/B/C)</h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="text-sm font-medium px-2">{zoom}%</span>
          
          <button
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleFullScreen}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Full Screen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Embed */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="bg-white shadow-lg mx-auto" style={{ width: `${zoom}%` }}>
          <iframe
            src={pdfUrl}
            className="w-full h-[800px] border-0"
            title="I-9 Form PDF"
          />
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border-t border-blue-200 px-4 py-3">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Section 1 and List A/B/C are already filled by the employee. 
          Verify this information matches the uploaded documents.
        </p>
      </div>
    </div>
  );
};

