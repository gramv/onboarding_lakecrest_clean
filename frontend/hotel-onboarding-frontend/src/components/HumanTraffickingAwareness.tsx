import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, Shield, Users, CheckCircle, PlayCircle } from 'lucide-react';
import YouTubeVideoPlayer from './YouTubeVideoPlayer';

interface HumanTraffickingAwarenessProps {
  onTrainingComplete: (data: any) => void;
  language?: 'en' | 'es';
  stepId?: string;
  initialProgress?: {
    currentSection?: number;
    hasWatchedVideo?: boolean;
    hasCompletedTraining?: boolean;
  };
}

const HumanTraffickingAwareness: React.FC<HumanTraffickingAwarenessProps> = ({
  onTrainingComplete,
  language = 'en',
  stepId = 'trafficking-awareness',
  initialProgress
}) => {
  const [currentSection, setCurrentSection] = useState(initialProgress?.currentSection || 0);
  const [hasWatchedVideo, setHasWatchedVideo] = useState(initialProgress?.hasWatchedVideo || false);
  const [hasCompletedTraining, setHasCompletedTraining] = useState(initialProgress?.hasCompletedTraining || false);
  
  // State for dynamic video IDs from HR settings
  const [videoIds, setVideoIds] = useState({ video_id_en: 'XhbfGo7voB8', video_id_es: 'XhbfGo7voB8' });

  // Fetch video settings from HR settings API on component mount
  useEffect(() => {
    const fetchVideoSettings = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/hr/settings/training-videos/public`);
        const data = await response.json();
        
        if (data.success && data.data) {
          console.log('🎥 Loaded training video settings from HR:', data.data);
          setVideoIds(data.data);
        } else {
          console.warn('⚠️ Failed to load video settings, using defaults');
        }
      } catch (error) {
        console.error('❌ Error fetching video settings, using defaults:', error);
        // Keep default video IDs on error
      }
    };
    
    fetchVideoSettings();
  }, []);

  const content = {
    en: {
      title: "Human Trafficking Awareness Training",
      subtitle: "Required Federal Training - Complete All Sections",
      sections: [
        {
          title: "What is Human Trafficking?",
          icon: <Users className="w-8 h-8 text-red-500" />,
          content: [
            "Human trafficking is a form of modern-day slavery that involves the use of force, fraud, or coercion to obtain some type of labor or commercial sex act.",
            "It affects millions of people worldwide, including in the United States.",
            "Victims can be any age, race, gender, or nationality.",
            "Trafficking can happen in any community - urban, suburban, or rural."
          ]
        },
        {
          title: "Types of Human Trafficking",
          icon: <AlertTriangle className="w-8 h-8 text-orange-500" />,
          content: [
            "Sex Trafficking: The recruitment, harboring, transportation, provision, obtaining, patronizing, or soliciting of a person for commercial sex acts through force, fraud, or coercion.",
            "Labor Trafficking: The recruitment, harboring, transportation, provision, or obtaining of a person for labor or services through force, fraud, or coercion.",
            "Common industries include: restaurants, hotels, domestic work, agriculture, manufacturing, and construction."
          ]
        },
        {
          title: "Warning Signs in the Workplace",
          icon: <Shield className="w-8 h-8 text-blue-500" />,
          content: [
            "Employee appears malnourished, injured, or shows signs of abuse",
            "Employee is not allowed to speak for themselves or is always accompanied",
            "Employee works excessive hours and has few or no days off",
            "Employee lives at the workplace or in overcrowded conditions",
            "Employee owes large debt and is unable to leave until debt is paid",
            "Employee's identification documents are held by someone else",
            "Employee appears fearful, anxious, or submissive"
          ]
        },
        {
          title: "How to Report Suspected Trafficking",
          icon: <Phone className="w-8 h-8 text-green-500" />,
          content: [
            "National Human Trafficking Hotline: 1-888-373-7888",
            "Text: 233733 (BEFREE)",
            "Online: humantraffickinghotline.org",
            "Local Law Enforcement: 911 (in emergencies)",
            "All reports can be made anonymously",
            "Available 24/7 in multiple languages"
          ]
        }
      ],
      video: {
        title: "Required Training Video",
        description: "Watch this comprehensive training video on human trafficking awareness. You must watch at least 95% of the video to continue.",
        videoId: videoIds.video_id_en
      },
      acknowledgment: {
        title: "Training Acknowledgment",
        statements: [
          "I have completed the required Human Trafficking Awareness Training",
          "I understand how to identify potential signs of human trafficking",
          "I know how to report suspected human trafficking incidents",
          "I understand this training is required by federal law"
        ]
      }
    },
    es: {
      title: "Capacitación sobre Concientización del Tráfico Humano",
      subtitle: "Capacitación Federal Requerida - Complete Todas las Secciones",
      sections: [
        {
          title: "¿Qué es el Tráfico Humano?",
          icon: <Users className="w-8 h-8 text-red-500" />,
          content: [
            "El tráfico humano es una forma de esclavitud moderna que implica el uso de fuerza, fraude o coacción para obtener algún tipo de trabajo o acto sexual comercial.",
            "Afecta a millones de personas en todo el mundo, incluso en los Estados Unidos.",
            "Las víctimas pueden ser de cualquier edad, raza, género o nacionalidad.",
            "El tráfico puede ocurrir en cualquier comunidad: urbana, suburbana o rural."
          ]
        },
        {
          title: "Tipos de Tráfico Humano",
          icon: <AlertTriangle className="w-8 h-8 text-orange-500" />,
          content: [
            "Tráfico Sexual: El reclutamiento, alojamiento, transporte, provisión, obtención, patrocinio o solicitud de una persona para actos sexuales comerciales mediante fuerza, fraude o coacción.",
            "Tráfico Laboral: El reclutamiento, alojamiento, transporte, provisión u obtención de una persona para trabajo o servicios mediante fuerza, fraude o coacción.",
            "Industrias comunes incluyen: restaurantes, hoteles, trabajo doméstico, agricultura, manufactura y construcción."
          ]
        },
        {
          title: "Señales de Advertencia en el Lugar de Trabajo",
          icon: <Shield className="w-8 h-8 text-blue-500" />,
          content: [
            "El empleado parece desnutrido, lesionado o muestra signos de abuso",
            "Al empleado no se le permite hablar por sí mismo o siempre está acompañado",
            "El empleado trabaja horas excesivas y tiene pocos o ningún día libre",
            "El empleado vive en el lugar de trabajo o en condiciones de hacinamiento",
            "El empleado debe una gran deuda y no puede irse hasta que se pague la deuda",
            "Los documentos de identificación del empleado están en poder de otra persona",
            "El empleado parece temeroso, ansioso o sumiso"
          ]
        },
        {
          title: "Cómo Reportar Sospecha de Tráfico",
          icon: <Phone className="w-8 h-8 text-green-500" />,
          content: [
            "Línea Nacional de Tráfico Humano: 1-888-373-7888",
            "Texto: 233733 (BEFREE)",
            "En línea: humantraffickinghotline.org",
            "Policía Local: 911 (en emergencias)",
            "Todos los reportes pueden hacerse de forma anónima",
            "Disponible 24/7 en múltiples idiomas"
          ]
        }
      ],
      video: {
        title: "Video de Capacitación Requerido",
        description: "Vea este video completo de capacitación sobre concientización del tráfico humano. Debe ver al menos el 95% del video para continuar.",
        videoId: videoIds.video_id_es
      },
      acknowledgment: {
        title: "Reconocimiento de Capacitación",
        statements: [
          "He completado la Capacitación de Concientización sobre Tráfico Humano requerida",
          "Entiendo cómo identificar posibles signos de tráfico humano",
          "Sé cómo reportar incidentes sospechosos de tráfico humano",
          "Entiendo que esta capacitación es requerida por ley federal"
        ]
      }
    }
  };

  const currentContent = content[language];
  const sections = currentContent.sections;

  // CRITICAL FIX: Sync hasWatchedVideo state with YouTubeVideoPlayer's session storage on mount
  // This ensures the button enables correctly even if states are out of sync
  useEffect(() => {
    const videoId = currentContent.video.videoId;
    const videoProgress = sessionStorage.getItem(`video_progress_${videoId}`);

    if (videoProgress) {
      try {
        const parsed = JSON.parse(videoProgress);
        if (parsed.percentage >= 95 && !hasWatchedVideo) {
          console.log('🔄 Syncing video completion from YouTubeVideoPlayer storage');
          console.log('📊 Video completion percentage:', parsed.percentage);
          setHasWatchedVideo(true);
          console.log('✅ hasWatchedVideo set to true from video storage');
        }
      } catch (e) {
        console.error('Failed to parse video progress:', e);
      }
    }
  }, []); // Run once on mount

  // Save progress to session storage whenever state changes
  useEffect(() => {
    const progressData = {
      currentSection,
      hasWatchedVideo,
      hasCompletedTraining
    };

    sessionStorage.setItem(`${stepId}_training_progress`, JSON.stringify(progressData));
  }, [currentSection, hasWatchedVideo, hasCompletedTraining, stepId]);

  const handleVideoComplete = () => {
    console.log('📹 Video completed! Enabling continue button...');
    console.log('🎯 Setting hasWatchedVideo to true');
    setHasWatchedVideo(true);
    console.log('✅ handleVideoComplete finished');
  };

  // Auto-scroll to continue button when video completes
  useEffect(() => {
    if (hasWatchedVideo && currentSection === sections.length) {
      console.log('✅ Video watched! Scrolling to continue button...');
      console.log('🔍 Current state - hasWatchedVideo:', hasWatchedVideo, 'currentSection:', currentSection);
      setTimeout(() => {
        const continueButton = document.querySelector('button:not(:disabled)[class*="green"]');
        if (continueButton) {
          console.log('🎯 Found continue button, scrolling into view');
          continueButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          console.warn('⚠️ Continue button not found in DOM');
        }
      }, 500);
    }
  }, [hasWatchedVideo, currentSection, sections.length]);

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else if (currentSection === sections.length - 1) {
      // Show video
      setCurrentSection(sections.length);
    } else if (currentSection === sections.length) {
      // Show acknowledgment
      setCurrentSection(sections.length + 1);
    }
  };

  const handleComplete = () => {
    const completionData = {
      completed_at: new Date().toISOString(),
      language: language,
      video_watched: hasWatchedVideo,
      training_duration_minutes: 20, // Estimate including video
      ip_address: '', // Would be captured on backend
      user_agent: navigator.userAgent
    };
    
    setHasCompletedTraining(true);
    onTrainingComplete(completionData);
  };

  const renderSection = (section: any, index: number) => (
    <div className="max-w-4xl mx-auto p-[clamp(0.75rem,2vw,1.5rem)]">
      <div className="flex items-center gap-[clamp(0.75rem,2vw,1rem)] mb-[clamp(1rem,3vw,1.5rem)]">
        <div className="flex-shrink-0">{section.icon}</div>
        <h2 className="text-[clamp(1.25rem,3.5vw,1.5rem)] font-bold text-gray-800">{section.title}</h2>
      </div>

      <div className="space-y-[clamp(0.75rem,2vw,1rem)]">
        {section.content.map((paragraph: string, idx: number) => (
          <p key={idx} className="text-gray-700 leading-relaxed text-[clamp(0.875rem,2.5vw,1.125rem)]">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-[clamp(0.75rem,2vw,1rem)] mt-[clamp(1.5rem,4vw,2rem)]">
        <div className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500 text-center sm:text-left">
          {language === 'es' ? 'Sección' : 'Section'} {index + 1} {language === 'es' ? 'de' : 'of'}{' '}
          {sections.length}
        </div>
        <button
          onClick={handleNext}
          className="w-full sm:w-auto bg-blue-600 text-white px-[clamp(1rem,3vw,1.5rem)] rounded-lg hover:bg-blue-700 transition-colors h-[clamp(2.75rem,6vw,3rem)] font-semibold text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center"
        >
          {language === 'es' ? 'Continuar' : 'Continue'}
        </button>
      </div>
    </div>
  );

  const renderVideo = () => (
    <div className="max-w-4xl mx-auto p-[clamp(0.75rem,2vw,1.5rem)]">
      <div className="flex items-center gap-[clamp(0.75rem,2vw,1rem)] mb-[clamp(1rem,3vw,1.5rem)]">
        <PlayCircle className="w-[clamp(1.5rem,4vw,2rem)] h-[clamp(1.5rem,4vw,2rem)] text-purple-500 flex-shrink-0" />
        <h2 className="text-[clamp(1.25rem,3.5vw,1.5rem)] font-bold text-gray-800">{currentContent.video.title}</h2>
      </div>

      <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-700 mb-[clamp(1rem,3vw,1.5rem)]">{currentContent.video.description}</p>

      <YouTubeVideoPlayer
        videoId={currentContent.video.videoId}
        onComplete={handleVideoComplete}
        language={language}
      />

      {/* DEV/TESTING ONLY: Skip Video Button */}
      {!hasWatchedVideo && (
        <div className="mt-[clamp(1rem,3vw,1.5rem)] p-[clamp(0.75rem,2vw,1rem)] bg-yellow-50 border border-yellow-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[clamp(0.75rem,2vw,0.875rem)] font-semibold text-yellow-800 uppercase tracking-wide">
                ⚠️ Testing Mode Only
              </p>
              <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-yellow-700 mt-[clamp(0.25rem,1vw,0.5rem)]">
                Skip video for testing purposes (not available in production)
              </p>
            </div>
            <button
              onClick={() => {
                console.log('🧪 [TEST MODE] Skipping video - marking as complete');
                handleVideoComplete();
              }}
              className="px-[clamp(1rem,3vw,1.5rem)] py-[clamp(0.5rem,1.5vw,0.75rem)] bg-yellow-600 text-white text-[clamp(0.875rem,2.5vw,1rem)] font-medium rounded-md hover:bg-yellow-700 transition-colors shadow-sm hover:shadow-md h-[clamp(2rem,4vw,2.5rem)]"
            >
              Skip Video (Test)
            </button>
          </div>
        </div>
      )}

      {/* Completion Alert - Shows when video is finished */}
      {hasWatchedVideo && (
        <div className="mt-[clamp(1rem,3vw,1.5rem)] bg-green-50 border-2 border-green-500 rounded-lg p-[clamp(0.75rem,2vw,1rem)] animate-pulse-once">
          <div className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)]">
            <CheckCircle className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-[clamp(0.875rem,2.5vw,1rem)]">
                ✓ {language === 'es' ? '¡Video Completado!' : 'Video Complete!'}
              </p>
              <p className="text-green-700 text-[clamp(0.75rem,2vw,0.875rem)]">
                {language === 'es'
                  ? 'Ahora puede continuar con el reconocimiento.'
                  : 'You may now continue to the acknowledgment.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-[clamp(0.75rem,2vw,1rem)] mt-[clamp(1.5rem,4vw,2rem)]">
        <div className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500 text-center sm:text-left">
          {language === 'es' ? 'Video de Capacitación' : 'Training Video'}
        </div>
        <button
          onClick={() => {
            console.log('🖱️ Continue button clicked - hasWatchedVideo:', hasWatchedVideo);
            handleNext();
          }}
          disabled={!hasWatchedVideo}
          className={`w-full sm:w-auto px-[clamp(1rem,3vw,2rem)] rounded-lg font-semibold transition-all duration-300 min-h-[2.75rem] h-auto py-[clamp(0.75rem,2vw,1rem)] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center ${
            hasWatchedVideo
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl transform hover:scale-105'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          <span className="text-center leading-tight">
            {hasWatchedVideo && '✓ '}
            <span className="hidden sm:inline">
              {language === 'es' ? 'Continuar al Reconocimiento' : 'Continue to Acknowledgment'}
            </span>
            <span className="sm:hidden">
              {language === 'es' ? 'Continuar' : 'Continue'}
            </span>
          </span>
          {/* Debug indicator in dev mode */}
          {process.env.NODE_ENV === 'development' && (
            <span className="ml-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.75rem,2vw,0.875rem)] opacity-50">
              [{hasWatchedVideo ? 'ENABLED' : 'DISABLED'}]
            </span>
          )}
        </button>
      </div>
    </div>
  );

  const renderAcknowledgment = () => (
    <div className="max-w-4xl mx-auto p-[clamp(0.75rem,2vw,1.5rem)]">
      <h2 className="text-[clamp(1.25rem,3.5vw,1.5rem)] font-bold text-gray-800 mb-[clamp(1rem,3vw,1.5rem)]">
        {currentContent.acknowledgment.title}
      </h2>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-[clamp(0.75rem,2vw,1.5rem)] mb-[clamp(1rem,3vw,1.5rem)]">
        <div className="flex items-start gap-[clamp(0.5rem,1.5vw,0.75rem)]">
          <AlertTriangle className="w-[clamp(1.25rem,3vw,1.5rem)] h-[clamp(1.25rem,3vw,1.5rem)] text-yellow-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-800 mb-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.875rem,2.5vw,1rem)]">
              {language === 'es' ? 'Requisito Legal Importante' : 'Important Legal Requirement'}
            </h3>
            <p className="text-yellow-700 text-[clamp(0.75rem,2vw,0.875rem)]">
              {language === 'es'
                ? 'Esta capacitación es requerida por ley federal. Su finalización será registrada y puede ser auditada por autoridades reguladoras.'
                : 'This training is required by federal law. Your completion will be recorded and may be audited by regulatory authorities.'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-[clamp(0.75rem,2vw,1rem)] mb-[clamp(1.5rem,4vw,2rem)]">
        {currentContent.acknowledgment.statements.map((statement: string, index: number) => (
          <div key={index} className="flex items-start gap-[clamp(0.5rem,1.5vw,0.75rem)]">
            <CheckCircle className="w-[clamp(1rem,2.5vw,1.25rem)] h-[clamp(1rem,2.5vw,1.25rem)] text-green-500 mt-1 flex-shrink-0" />
            <span className="text-gray-700 text-[clamp(0.875rem,2.5vw,1rem)]">{statement}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-[clamp(0.75rem,2vw,1.5rem)] mb-[clamp(1rem,3vw,1.5rem)]">
        <h3 className="font-semibold text-gray-800 mb-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.875rem,2.5vw,1rem)]">
          {language === 'es' ? 'Información de Contacto de Emergencia' : 'Emergency Contact Information'}
        </h3>
        <div className="space-y-[clamp(0.25rem,1vw,0.5rem)] text-[clamp(0.75rem,2vw,0.875rem)]">
          <p>
            <strong>
              {language === 'es'
                ? 'Línea Nacional de Tráfico Humano:'
                : 'National Human Trafficking Hotline:'}
            </strong>{' '}
            1-888-373-7888
          </p>
          <p>
            <strong>{language === 'es' ? 'Texto:' : 'Text:'}</strong> 233733 (BEFREE)
          </p>
          <p>
            <strong>{language === 'es' ? 'Sitio web:' : 'Website:'}</strong> humantraffickinghotline.org
          </p>
          <p>
            <strong>{language === 'es' ? 'Emergencia:' : 'Emergency:'}</strong> 911
          </p>
        </div>
      </div>

      {!hasCompletedTraining ? (
        <button
          onClick={handleComplete}
          className="w-full bg-green-600 text-white px-[clamp(1rem,3vw,1.5rem)] rounded-lg hover:bg-green-700 transition-all duration-300 font-semibold h-[clamp(2.75rem,6vw,3rem)] shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center"
        >
          {language === 'es'
            ? 'Reconozco la Finalización de Esta Capacitación'
            : 'I Acknowledge Completion of This Training'}
        </button>
      ) : (
        <div className="text-center py-[clamp(1rem,3vw,1.5rem)]">
          <CheckCircle className="w-[clamp(3rem,8vw,4rem)] h-[clamp(3rem,8vw,4rem)] text-green-500 mx-auto mb-[clamp(0.75rem,2vw,1rem)]" />
          <h3 className="text-[clamp(1.125rem,3vw,1.25rem)] font-semibold text-green-800 mb-[clamp(0.5rem,1.5vw,0.75rem)]">
            {language === 'es' ? 'Capacitación Completada Exitosamente' : 'Training Completed Successfully'}
          </h3>
          <p className="text-gray-600 text-[clamp(0.875rem,2.5vw,1rem)]">
            {language === 'es' ? 'Su finalización ha sido registrada.' : 'Your completion has been recorded.'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto p-[clamp(1rem,3vw,1.5rem)]">
          <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-gray-800">{currentContent.title}</h1>
          <p className="text-gray-600 mt-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.875rem,2.5vw,1rem)]">{currentContent.subtitle}</p>

          {/* Enhanced Progress bar with step indicators */}
          <div className="mt-[clamp(1rem,3vw,1.5rem)]">
            <div className="flex justify-between text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500 mb-[clamp(0.5rem,1.5vw,0.75rem)]">
              <span>{language === 'es' ? 'Progreso' : 'Progress'}</span>
              <span className="font-semibold">
                {Math.round(((currentSection + 1) / (sections.length + 2)) * 100)}%{' '}
                {language === 'es' ? 'Completo' : 'Complete'}
              </span>
            </div>

            {/* Step indicators */}
            <div className="flex justify-between mb-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.75rem,2vw,0.875rem)] gap-[clamp(0.5rem,1.5vw,0.75rem)]">
              <div
                className={`flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] ${
                  currentSection < sections.length ? 'text-blue-600 font-semibold' : 'text-green-600'
                }`}
              >
                {currentSection >= sections.length ? (
                  <CheckCircle className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)]" />
                ) : (
                  <span className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)] rounded-full border-2 border-current flex items-center justify-center text-[clamp(0.5rem,1.5vw,0.625rem)]">
                    {currentSection + 1}
                  </span>
                )}
                <span className="hidden sm:inline">
                  {language === 'es' ? 'Secciones' : 'Sections'}
                </span>
                <span className="sm:hidden">{language === 'es' ? 'Sec' : 'Sec'}</span>
              </div>

              <div
                className={`flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] ${
                  currentSection === sections.length
                    ? 'text-blue-600 font-semibold'
                    : currentSection > sections.length
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                {hasWatchedVideo ? (
                  <CheckCircle className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)]" />
                ) : (
                  <PlayCircle className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)]" />
                )}
                <span>{language === 'es' ? 'Video' : 'Video'}</span>
              </div>

              <div
                className={`flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] ${
                  currentSection === sections.length + 1
                    ? 'text-blue-600 font-semibold'
                    : hasCompletedTraining
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                {hasCompletedTraining ? (
                  <CheckCircle className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)]" />
                ) : (
                  <Shield className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)]" />
                )}
                <span className="hidden sm:inline">
                  {language === 'es' ? 'Firmar' : 'Sign'}
                </span>
                <span className="sm:hidden">{language === 'es' ? 'Fin' : 'Sign'}</span>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-[clamp(0.5rem,1.5vw,0.75rem)]">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-[clamp(0.5rem,1.5vw,0.75rem)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentSection + 1) / (sections.length + 2)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="py-[clamp(1.5rem,4vw,2rem)]">
        {currentSection < sections.length && renderSection(sections[currentSection], currentSection)}
        {currentSection === sections.length && renderVideo()}
        {currentSection === sections.length + 1 && renderAcknowledgment()}
      </div>
    </div>
  );
};

export default HumanTraffickingAwareness;