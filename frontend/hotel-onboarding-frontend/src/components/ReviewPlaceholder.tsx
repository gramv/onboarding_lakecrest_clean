import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Eye, Edit, Construction } from 'lucide-react'

interface ReviewPlaceholderProps {
  formType: string
  formTitle: string
  description?: string
  isReady: boolean
  onReview?: () => void
  onEdit?: () => void
  language?: 'en' | 'es'
}

export default function ReviewPlaceholder({
  formType,
  formTitle,
  description,
  isReady,
  onReview,
  onEdit,
  language = 'en'
}: ReviewPlaceholderProps) {
  
  const translations = {
    en: {
      reviewTitle: 'Review & Sign',
      reviewDesc: 'Review your information and provide digital signature',
      notReady: 'Complete the form before reviewing',
      reviewButton: 'Review and Sign',
      editButton: 'Edit Form',
      placeholderNotice: 'Review functionality coming soon',
      placeholderDesc: 'This will show a PDF preview of your completed form before signing'
    },
    es: {
      reviewTitle: 'Revisar y Firmar',
      reviewDesc: 'Revise su información y proporcione firma digital',
      notReady: 'Complete el formulario antes de revisar',
      reviewButton: 'Revisar y Firmar',
      editButton: 'Editar Formulario',
      placeholderNotice: 'Funcionalidad de revisión próximamente',
      placeholderDesc: 'Esto mostrará una vista previa en PDF de su formulario completado antes de firmar'
    }
  }
  
  const t = translations[language]
  
  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-700">
          <Eye className="h-5 w-5" />
          <span>{formTitle} - {t.reviewTitle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Placeholder Notice */}
          <Alert className="bg-yellow-50 border-yellow-200">
            <Construction className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>{t.placeholderNotice}:</strong> {t.placeholderDesc}
            </AlertDescription>
          </Alert>
          
          {/* Description */}
          {description && (
            <p className="text-gray-600">{description || t.reviewDesc}</p>
          )}
          
          {/* Form Status */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-900">Form Status</span>
              <span className={`text-sm font-medium ${isReady ? 'text-green-600' : 'text-orange-600'}`}>
                {isReady ? 'Ready for Review' : 'Incomplete'}
              </span>
            </div>
            
            {!isReady && (
              <p className="text-sm text-gray-600">{t.notReady}</p>
            )}
          </div>
          
          {/* Placeholder Preview Area */}
          <div className="bg-white rounded-lg p-8 border border-gray-200 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">PDF Preview Area</p>
            <p className="text-sm text-gray-400">
              The completed {formTitle} will appear here for review
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            {onEdit && (
              <Button 
                variant="outline" 
                onClick={onEdit}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>{t.editButton}</span>
              </Button>
            )}
            
            <Button 
              onClick={onReview || (() => console.log(`Review ${formType}`))}
              disabled={!isReady}
              className={`flex items-center space-x-2 ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Eye className="h-4 w-4" />
              <span>{t.reviewButton}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}