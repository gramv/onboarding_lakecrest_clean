/**
 * Test component to verify API deduplication is working
 * This can be temporarily added to test the fix
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiService } from '@/services/apiService'

export function ApiTestComponent() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`${timestamp}: ${message}`, ...prev].slice(0, 20))
  }

  const testDuplicateCalls = async () => {
    setLoading(true)
    addLog('Starting duplicate API call test...')
    
    try {
      // Make multiple simultaneous calls to the same endpoints
      addLog('Making 5 simultaneous properties calls...')
      const propertiesPromises = Array.from({ length: 5 }, (_, i) => {
        addLog(`Properties call ${i + 1} started`)
        return apiService.getProperties()
      })

      addLog('Making 5 simultaneous managers calls...')
      const managersPromises = Array.from({ length: 5 }, (_, i) => {
        addLog(`Managers call ${i + 1} started`)
        return apiService.getManagers()
      })

      // Wait for all calls to complete
      const [propertiesResults, managersResults] = await Promise.all([
        Promise.all(propertiesPromises),
        Promise.all(managersPromises)
      ])

      addLog(`Properties results: ${propertiesResults.map(r => r.length).join(', ')}`)
      addLog(`Managers results: ${managersResults.map(r => r.length).join(', ')}`)
      addLog('Test completed successfully!')

      // Check cache stats
      const cacheStats = apiService.getCacheStats()
      addLog(`Cache size: ${cacheStats.size}`)
      addLog(`Cache keys: ${cacheStats.keys.join(', ')}`)

    } catch (error) {
      addLog(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const clearCache = () => {
    apiService.clearCache()
    addLog('Cache cleared')
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>API Deduplication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testDuplicateCalls} disabled={loading}>
            {loading ? 'Testing...' : 'Test Duplicate Calls'}
          </Button>
          <Button variant="outline" onClick={clearCache}>
            Clear Cache
          </Button>
          <Button variant="outline" onClick={clearLogs}>
            Clear Logs
          </Button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
          <div className="text-sm font-mono">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click "Test Duplicate Calls" to start.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}