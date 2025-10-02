import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { extractI9FieldNames } from '@/utils/extractI9FieldNames'

export default function ExtractI9Fields() {
  const [output, setOutput] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleExtract = async () => {
    setIsLoading(true)
    setOutput([])
    
    // Capture console output
    const originalLog = console.log
    const logs: string[] = []
    
    console.log = (...args) => {
      logs.push(args.join(' '))
      originalLog(...args)
    }
    
    try {
      await extractI9FieldNames()
      setOutput(logs)
    } catch (error) {
      setOutput([`Error: ${error}`])
    } finally {
      console.log = originalLog
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>I-9 Form Field Name Extractor</CardTitle>
          <p className="text-sm text-gray-600">
            This tool extracts all field names from the I-9 PDF form to ensure accurate mapping
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleExtract} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Extracting...' : 'Extract Field Names'}
          </Button>
          
          {output.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Extraction Results:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                {output.join('\n')}
              </pre>
              
              <Button 
                onClick={() => {
                  const text = output.join('\n')
                  navigator.clipboard.writeText(text)
                  alert('Copied to clipboard!')
                }}
                className="mt-4"
                variant="outline"
              >
                Copy to Clipboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}