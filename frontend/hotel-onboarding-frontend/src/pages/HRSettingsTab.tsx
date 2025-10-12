import React, { useState, useEffect } from 'react';
import { Save, Video, AlertCircle, CheckCircle, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/services/api';

interface VideoSettings {
  video_id_en: string;
  video_id_es: string;
}

export default function HRSettingsTab() {
  const [settings, setSettings] = useState<VideoSettings>({ video_id_en: '', video_id_es: '' });
  const [originalSettings, setOriginalSettings] = useState<VideoSettings>({ video_id_en: '', video_id_es: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.hr.getTrainingVideoSettings();
      if (response.data.success) {
        const loadedSettings = response.data.data;
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
        console.log('✅ Loaded current settings:', loadedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings. Please refresh the page.' });
    } finally {
      setLoading(false);
    }
  };

  // Track changes
  useEffect(() => {
    const changed = settings.video_id_en !== originalSettings.video_id_en || 
                    settings.video_id_es !== originalSettings.video_id_es;
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      console.log('💾 Saving settings:', settings);
      const response = await api.hr.updateTrainingVideoSettings(settings);
      if (response.data.success) {
        setOriginalSettings(settings); // Update original after successful save
        console.log('✅ Settings saved successfully');
        setMessage({ 
          type: 'success', 
          text: `✓ Settings updated! English: ${settings.video_id_en} | Spanish: ${settings.video_id_es}` 
        });
        
        // Clear success message after 10 seconds
        setTimeout(() => setMessage(null), 10000);
      }
    } catch (error: any) {
      console.error('❌ Failed to save settings:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Failed to save settings. Please try again.';
      setMessage({ type: 'error', text: `Error: ${errorMsg}` });
    } finally {
      setSaving(false);
    }
  };

  const extractVideoId = (url: string): string => {
    // Extract video ID from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return url;
  };

  const handleInputChange = (field: 'video_id_en' | 'video_id_es', value: string) => {
    const videoId = extractVideoId(value.trim());
    setSettings(prev => ({ ...prev, [field]: videoId }));
    
    // Clear any existing messages when user starts editing
    if (message) {
      setMessage(null);
    }
  };

  const isValidVideoId = (id: string): boolean => {
    return id.length === 11 && /^[a-zA-Z0-9_-]+$/.test(id);
  };

  const canSave = settings.video_id_en && 
                  settings.video_id_es && 
                  isValidVideoId(settings.video_id_en) && 
                  isValidVideoId(settings.video_id_es);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-3 rounded-lg">
          <SettingsIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">HR Settings</h2>
          <p className="text-gray-600 mt-1">Configure system settings and training materials</p>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Training Videos Settings */}
      <Card>
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-purple-600" />
            Human Trafficking Training Videos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Important Information</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Configure YouTube videos for human trafficking awareness training</li>
                  <li>Employees must watch 95% of the video to complete this step</li>
                  <li>Changes will apply immediately to new onboarding sessions</li>
                  <li>Ensure videos have captions in the appropriate language</li>
                </ul>
              </div>
            </div>
          </div>

          {/* English Video */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                English Training Video
              </label>
              {originalSettings.video_id_en && !hasChanges && (
                <a 
                  href={`https://www.youtube.com/watch?v=${originalSettings.video_id_en}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                >
                  View Current Video →
                </a>
              )}
            </div>
            
            {/* Current Video ID Display */}
            {originalSettings.video_id_en && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Current Video ID:</p>
                <code className="text-sm text-gray-800 font-mono bg-white px-2 py-1 rounded border border-gray-300">
                  {originalSettings.video_id_en}
                </code>
                <p className="text-xs text-gray-500 mt-1">
                  Link: <a href={`https://www.youtube.com/watch?v=${originalSettings.video_id_en}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    youtube.com/watch?v={originalSettings.video_id_en}
                  </a>
                </p>
              </div>
            )}
            
            <input
              type="text"
              value={settings.video_id_en}
              onChange={(e) => handleInputChange('video_id_en', e.target.value)}
              placeholder="Enter YouTube video ID or URL"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                hasChanges && settings.video_id_en !== originalSettings.video_id_en 
                  ? 'border-yellow-400 bg-yellow-50' 
                  : 'border-gray-300'
              }`}
            />
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <div className="flex-1">
                <p>Example formats:</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5 mt-1">
                  <li>Video ID: <code className="bg-gray-100 px-1 py-0.5 rounded">XhbfGo7voB8</code></li>
                  <li>Full URL: <code className="bg-gray-100 px-1 py-0.5 rounded">https://www.youtube.com/watch?v=XhbfGo7voB8</code></li>
                  <li>Short URL: <code className="bg-gray-100 px-1 py-0.5 rounded">https://youtu.be/XhbfGo7voB8</code></li>
                </ul>
              </div>
              {settings.video_id_en && (
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  isValidVideoId(settings.video_id_en) 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {isValidVideoId(settings.video_id_en) ? '✓ Valid' : '✗ Invalid'}
                </div>
              )}
            </div>
            
            {settings.video_id_en && isValidVideoId(settings.video_id_en) && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gray-700">Preview:</p>
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-md">
                  <iframe
                    src={`https://www.youtube.com/embed/${settings.video_id_en}`}
                    className="w-full h-full"
                    title="English Training Video Preview"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t pt-6"></div>

          {/* Spanish Video */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                Spanish Training Video (Video de Capacitación en Español)
              </label>
              {originalSettings.video_id_es && !hasChanges && (
                <a 
                  href={`https://www.youtube.com/watch?v=${originalSettings.video_id_es}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                >
                  View Current Video →
                </a>
              )}
            </div>
            
            {/* Current Video ID Display */}
            {originalSettings.video_id_es && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Current Video ID:</p>
                <code className="text-sm text-gray-800 font-mono bg-white px-2 py-1 rounded border border-gray-300">
                  {originalSettings.video_id_es}
                </code>
                <p className="text-xs text-gray-500 mt-1">
                  Link: <a href={`https://www.youtube.com/watch?v=${originalSettings.video_id_es}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    youtube.com/watch?v={originalSettings.video_id_es}
                  </a>
                </p>
              </div>
            )}
            
            <input
              type="text"
              value={settings.video_id_es}
              onChange={(e) => handleInputChange('video_id_es', e.target.value)}
              placeholder="Enter YouTube video ID or URL"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                hasChanges && settings.video_id_es !== originalSettings.video_id_es 
                  ? 'border-yellow-400 bg-yellow-50' 
                  : 'border-gray-300'
              }`}
            />
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <div className="flex-1">
                <p>Example formats:</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5 mt-1">
                  <li>Video ID: <code className="bg-gray-100 px-1 py-0.5 rounded">XhbfGo7voB8</code></li>
                  <li>Full URL: <code className="bg-gray-100 px-1 py-0.5 rounded">https://www.youtube.com/watch?v=XhbfGo7voB8</code></li>
                  <li>Short URL: <code className="bg-gray-100 px-1 py-0.5 rounded">https://youtu.be/XhbfGo7voB8</code></li>
                </ul>
              </div>
              {settings.video_id_es && (
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  isValidVideoId(settings.video_id_es) 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {isValidVideoId(settings.video_id_es) ? '✓ Valid' : '✗ Invalid'}
                </div>
              )}
            </div>
            
            {settings.video_id_es && isValidVideoId(settings.video_id_es) && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gray-700">Preview:</p>
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-md">
                  <iframe
                    src={`https://www.youtube.com/embed/${settings.video_id_es}`}
                    className="w-full h-full"
                    title="Spanish Training Video Preview"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-6 border-t">
            <div className="flex-1">
              {hasChanges && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-yellow-700 font-medium">You have unsaved changes</span>
                </div>
              )}
              {!hasChanges && originalSettings.video_id_en && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>All changes saved</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {canSave && hasChanges ? 'Ready to save changes' : !canSave ? 'Please enter valid video IDs for both languages' : 'Settings are up to date'}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !canSave || !hasChanges}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all shadow-sm ${
                hasChanges && canSave
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {hasChanges ? 'Save Changes' : 'No Changes'}
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>How to find a YouTube video ID:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to the YouTube video you want to use</li>
            <li>Look at the URL in your browser's address bar</li>
            <li>The video ID is the 11-character code after <code className="bg-white px-1 py-0.5 rounded">v=</code></li>
            <li>Copy and paste either the full URL or just the video ID here</li>
          </ol>
          <p className="mt-3 pt-3 border-t border-gray-300">
            <strong>Tip:</strong> Choose videos that are engaging, professional, and appropriate length (5-15 minutes recommended).
            Ensure videos have closed captions available in the target language for accessibility.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

