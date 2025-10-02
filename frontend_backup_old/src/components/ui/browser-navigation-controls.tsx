import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, ArrowRight, Bookmark, Copy, History } from 'lucide-react'

interface BrowserNavigationControlsProps {
  canGoBack: boolean
  canGoForward: boolean
  onGoBack: () => void
  onGoForward: () => void
  currentSection: string
  getBookmarkUrl: (section?: string) => string
  copyBookmarkUrl: (section?: string) => Promise<boolean>
  navigationHistory: string[]
  className?: string
}

export function BrowserNavigationControls({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  currentSection,
  getBookmarkUrl,
  copyBookmarkUrl,
  navigationHistory,
  className = ''
}: BrowserNavigationControlsProps) {
  const { success: showSuccess, error: showError } = useToast()

  const handleCopyBookmark = async () => {
    const success = await copyBookmarkUrl()
    if (success) {
      showSuccess('Bookmark copied', 'URL copied to clipboard')
    } else {
      showError('Copy failed', 'Failed to copy URL to clipboard')
    }
  }

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Browser Navigation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onGoBack}
            disabled={!canGoBack}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGoForward}
            disabled={!canGoForward}
            className="flex items-center gap-1"
          >
            <ArrowRight className="h-3 w-3" />
            Forward
          </Button>
        </div>

        {/* Current Section */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Current Section:</p>
          <Badge variant="secondary" className="text-xs">
            {currentSection}
          </Badge>
        </div>

        {/* Bookmark Controls */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Bookmark URL:</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyBookmark}
              className="flex items-center gap-1 text-xs"
            >
              <Copy className="h-3 w-3" />
              Copy URL
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getBookmarkUrl(), '_blank')}
              className="flex items-center gap-1 text-xs"
            >
              <Bookmark className="h-3 w-3" />
              Open
            </Button>
          </div>
        </div>

        {/* Navigation History */}
        {navigationHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Recent History:</p>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {navigationHistory.slice(-5).map((path, index) => (
                <div key={index} className="text-xs text-muted-foreground truncate">
                  {path}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}