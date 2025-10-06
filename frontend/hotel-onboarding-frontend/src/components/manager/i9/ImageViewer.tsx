import React, { useState } from 'react';
import { Eye, FileText, X, ZoomIn, ZoomOut } from 'lucide-react';
import { getDocumentTitle } from '../../../types/i9ManagerReview';

interface UploadedImage {
  id: string;
  document_type: string;
  file_name: string;
  url: string;
}

interface ImageViewerProps {
  images: UploadedImage[];
}

interface FullScreenModalProps {
  image: UploadedImage;
  onClose: () => void;
}

const FullScreenModal: React.FC<FullScreenModalProps> = ({ image, onClose }) => {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-bold text-lg">{getDocumentTitle(image.document_type as any)}</h3>
            <p className="text-sm text-gray-600">{image.file_name}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            
            <span className="text-sm font-medium px-3">{zoom}%</span>
            
            <button
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Image */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <div className="flex items-center justify-center min-h-full">
            <img
              src={image.url}
              alt={image.file_name}
              style={{ width: `${zoom}%` }}
              className="max-w-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ImageViewer: React.FC<ImageViewerProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);

  return (
    <div className="h-full flex flex-col border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-blue-50 border-b px-4 py-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Uploaded Verification Documents
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {images.length} document{images.length !== 1 ? 's' : ''} uploaded • Click to enlarge
        </p>
      </div>

      {/* Images List */}
      <div className="flex-1 overflow-auto p-4">
        {images.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No documents uploaded</p>
            <p className="text-xs mt-2">Employee needs to upload verification documents</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer bg-white"
                onClick={() => setSelectedImage(image)}
              >
                {/* Document Header */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-gray-900">
                      Document {index + 1}: {getDocumentTitle(image.document_type as any)}
                    </h4>
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                </div>

                {/* Image Preview */}
                <div className="relative h-56 bg-gray-50 group">
                  <img
                    src={image.url}
                    alt={image.file_name}
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-60 transition-opacity">
                    <div className="text-center text-white">
                      <Eye className="h-10 w-10 mx-auto mb-2" />
                      <p className="text-sm font-medium">Click to view full size</p>
                    </div>
                  </div>
                </div>

                {/* File Info */}
                <div className="px-3 py-2 bg-gray-50 border-t">
                  <p className="text-xs text-gray-600 truncate" title={image.file_name}>
                    📎 {image.file_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3">
        <p className="text-sm text-yellow-900">
          <strong>💡 Tip:</strong> Verify that the information in Section 1 matches these documents
        </p>
      </div>

      {/* Full Screen Modal */}
      {selectedImage && (
        <FullScreenModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

