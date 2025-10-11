/**
 * Document PDF Viewer
 * Displays PDF with optional side-by-side uploaded documents
 */

import React, { useState } from 'react';
import { FileText, Image as ImageIcon, ZoomIn, ZoomOut, Download, X } from 'lucide-react';

interface UploadedDocument {
  type: string;
  url: string;
  filename: string;
}

interface DocumentPDFViewerProps {
  pdfUrl: string;
  pdfDataUrl?: string;
  documentName: string;
  uploadedDocs?: UploadedDocument[];
  showSideBySide?: boolean;
}

export const DocumentPDFViewer: React.FC<DocumentPDFViewerProps> = ({
  pdfUrl,
  pdfDataUrl,
  documentName,
  uploadedDocs = [],
  showSideBySide = false
}) => {
  const [selectedUploadedDoc, setSelectedUploadedDoc] = useState<UploadedDocument | null>(
    uploadedDocs.length > 0 ? uploadedDocs[0] : null
  );
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');

  const handleImageClick = (url: string) => {
    setModalImageUrl(url);
    setImageModalOpen(true);
  };

  const viewerSrc = pdfDataUrl || pdfUrl;

  const handleDownloadPDF = () => {
    const target = pdfUrl || pdfDataUrl;
    if (target) {
      window.open(target, '_blank');
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">{documentName}</h3>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download PDF</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main PDF Viewer */}
        <div className={`${showSideBySide && uploadedDocs.length > 0 ? 'w-1/2' : 'w-full'} border-r`}>
          <div className="h-full overflow-auto bg-gray-100 p-4">
            <iframe
              src={viewerSrc}
              className="w-full h-full border-0 rounded-lg shadow-lg bg-white"
              title={documentName}
            />
          </div>
        </div>

        {/* Side-by-Side Uploaded Documents */}
        {showSideBySide && uploadedDocs.length > 0 && (
          <div className="w-1/2 flex flex-col">
            {/* Uploaded Docs Tabs */}
            <div className="flex items-center space-x-2 p-4 bg-gray-50 border-b overflow-x-auto">
              {uploadedDocs.map((doc) => (
                <button
                  key={doc.filename}
                  onClick={() => setSelectedUploadedDoc(doc)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors
                    ${
                      selectedUploadedDoc?.filename === doc.filename
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm font-medium capitalize">
                    {doc.type.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>

            {/* Uploaded Doc Viewer */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {selectedUploadedDoc && (
                <div className="h-full flex flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {selectedUploadedDoc.filename}
                    </p>
                    <button
                      onClick={() => handleImageClick(selectedUploadedDoc.url)}
                      className="flex items-center space-x-1 px-3 py-1 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                      <span className="text-sm">Enlarge</span>
                    </button>
                  </div>
                  <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
                    <img
                      src={selectedUploadedDoc.url}
                      alt={selectedUploadedDoc.type}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {imageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-7xl max-h-screen p-4">
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
            <img
              src={modalImageUrl}
              alt="Enlarged view"
              className="max-w-full max-h-screen object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentPDFViewer;
