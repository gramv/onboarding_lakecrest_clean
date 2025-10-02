import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Camera, RefreshCw, AlertTriangle } from 'lucide-react'

interface StepProps {
  currentStep: any
  progress: any
  markStepComplete: (stepId: string, data?: any) => void
  saveProgress: (stepId: string, data?: any) => void
  language: 'en' | 'es'
  employee?: any
  property?: any
}

export default function PhotoCaptureStep(props: StepProps) {
  const { currentStep, progress, markStepComplete, saveProgress, language = 'en' } = props
  
  const [isComplete, setIsComplete] = useState(false)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const existingData = progress.stepData?.['photo_capture']
    if (existingData) {
      setPhotoData(existingData.photoData)
      setIsComplete(existingData.completed || false)
    }
  }, [progress])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsCapturing(true)
    } catch (error) {
      alert('Unable to access camera. Please ensure camera permissions are granted.')
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (context) {
        context.drawImage(video, 0, 0)
        const photoDataUrl = canvas.toDataURL('image/jpeg')
        setPhotoData(photoDataUrl)
        stopCamera()
      }
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCapturing(false)
  }

  const retakePhoto = () => {
    setPhotoData(null)
    startCamera()
  }

  const handleSubmit = () => {
    if (!photoData) {
      alert('Please capture a photo before proceeding.')
      return
    }

    setIsComplete(true)
    const stepData = {
      photoData,
      completed: true,
      completedAt: new Date().toISOString()
    }
    markStepComplete('photo_capture', stepData)
    saveProgress()
  }

  const translations = {
    en: {
      title: 'Employee Photo',
      subtitle: 'Capture Your Photo for Employee Badge',
      description: 'Please take a clear photo that will be used for your employee identification badge.',
      completedNotice: 'Employee photo captured successfully.',
      instructions: 'Photo Guidelines',
      guidelinesList: [
        'Look directly at the camera',
        'Ensure good lighting on your face',
        'Remove sunglasses and hats',
        'Use a neutral facial expression',
        'Make sure your full face is visible'
      ],
      startCamera: 'Start Camera',
      capturePhoto: 'Capture Photo',
      retakePhoto: 'Retake Photo',
      confirmPhoto: 'Use This Photo',
      estimatedTime: 'Estimated time: 2 minutes'
    },
    es: {
      title: 'Foto del Empleado',
      subtitle: 'Capture Su Foto para la Credencial de Empleado',
      description: 'Por favor tome una foto clara que será usada para su credencial de identificación de empleado.',
      completedNotice: 'Foto del empleado capturada exitosamente.',
      instructions: 'Guías para la Foto',
      guidelinesList: [
        'Mire directamente a la cámara',
        'Asegure buena iluminación en su cara',
        'Quítese los lentes de sol y sombreros',
        'Use una expresión facial neutral',
        'Asegúrese de que toda su cara sea visible'
      ],
      startCamera: 'Iniciar Cámara',
      capturePhoto: 'Capturar Foto',
      retakePhoto: 'Tomar Foto Nuevamente',
      confirmPhoto: 'Usar Esta Foto',
      estimatedTime: 'Tiempo estimado: 2 minutos'
    }
  }

  const t = translations[language]

  return (
    <div className="space-y-6 pb-32">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Camera className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        </div>
        <p className="text-gray-600 max-w-3xl mx-auto">{t.description}</p>
      </div>

      {isComplete && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{t.completedNotice}</AlertDescription>
        </Alert>
      )}

      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            <span>{t.instructions}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-orange-800">
          <ul className="space-y-2 text-sm">
            {t.guidelinesList.map((guideline, index) => (
              <li key={index}>• {guideline}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-blue-600" />
            <span>{t.subtitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ width: '320px', height: '240px' }}>
                {isCapturing && (
                  <video
                    ref={videoRef}
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                )}
                {photoData && !isCapturing && (
                  <img
                    src={photoData}
                    alt="Captured employee photo"
                    className="w-full h-full object-cover"
                  />
                )}
                {!isCapturing && !photoData && (
                  <div className="flex items-center justify-center w-full h-full">
                    <Camera className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-center space-x-4">
              {!isCapturing && !photoData && (
                <Button onClick={startCamera} className="flex items-center space-x-2">
                  <Camera className="h-4 w-4" />
                  <span>{t.startCamera}</span>
                </Button>
              )}
              
              {isCapturing && (
                <Button onClick={capturePhoto} className="flex items-center space-x-2">
                  <Camera className="h-4 w-4" />
                  <span>{t.capturePhoto}</span>
                </Button>
              )}
              
              {photoData && !isCapturing && (
                <>
                  <Button onClick={retakePhoto} variant="outline" className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4" />
                    <span>{t.retakePhoto}</span>
                  </Button>
                  <Button onClick={handleSubmit} disabled={isComplete} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>{isComplete ? 'Photo Saved' : t.confirmPhoto}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500">
        <p>{t.estimatedTime}</p>
      </div>
    </div>
  )
}