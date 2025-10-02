import React, { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/services/api'
import { Loader2, Mail, Trash2, UserPlus, Bell } from 'lucide-react'
import type { AxiosError } from 'axios'

interface NotificationPreferences {
  applications: boolean
  approvals: boolean
  reminders: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  applications: true,
  approvals: true,
  reminders: true
}

interface EmailRecipient {
  id: string
  email: string
  name?: string
  is_active?: boolean
  receives_applications?: boolean
  created_at?: string
}

export const ManagerNotificationSettings: React.FC = () => {
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [recipients, setRecipients] = useState<EmailRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [submittingRecipient, setSubmittingRecipient] = useState(false)
  const [newRecipientEmail, setNewRecipientEmail] = useState('')
  const [newRecipientName, setNewRecipientName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const parseErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const axiosError = error as AxiosError<{ detail?: string; error?: string }>
      return axiosError.response?.data?.detail || axiosError.response?.data?.error || fallback
    }
    if (error instanceof Error) {
      return error.message
    }
    return fallback
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [prefResponse, recipientsResponse] = await Promise.all([
        api.manager.getNotificationPreferences(),
        api.manager.getEmailRecipients()
      ])

      setPreferences(prefResponse?.data ?? DEFAULT_PREFERENCES)
      setRecipients(Array.isArray(recipientsResponse?.data) ? recipientsResponse.data : [])
    } catch (error) {
      console.error('Failed to load notification settings:', error)
      toast({
        title: 'Unable to load notification settings',
        description: parseErrorMessage(error, 'Please try again later.'),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [parseErrorMessage, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updatePreferences = async (updated: NotificationPreferences) => {
    setSavingPrefs(true)
    setPreferences(updated)
    try {
      await api.manager.updateNotificationPreferences(updated)
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved.'
      })
    } catch (error) {
      console.error('Failed to update preferences:', error)
      toast({
        title: 'Unable to update preferences',
        description: parseErrorMessage(error, 'Please try again later.'),
        variant: 'destructive'
      })
      await loadData()
    } finally {
      setSavingPrefs(false)
    }
  }

  const handlePreferenceToggle = (key: keyof NotificationPreferences, value: boolean) => {
    updatePreferences({ ...preferences, [key]: value })
  }

  const handleAddRecipient = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newRecipientEmail.trim()) {
      return
    }

    setSubmittingRecipient(true)
    setFormError(null)
    try {
      await api.manager.addEmailRecipient({
        email: newRecipientEmail.trim(),
        name: newRecipientName.trim() || undefined
      })
      setNewRecipientEmail('')
      setNewRecipientName('')
      toast({
        title: 'Recipient added',
        description: 'The email will now receive job application notifications.'
      })
      loadData()
    } catch (error) {
      console.error('Failed to add recipient:', error)
      const parsedError = parseErrorMessage(error, 'Please confirm the email and try again.')
      setFormError(parsedError)
      toast({
        title: 'Unable to add recipient',
        description: parsedError,
        variant: 'destructive'
      })
    } finally {
      setSubmittingRecipient(false)
    }
  }

  const handleRecipientUpdate = async (recipientId: string, updates: Partial<EmailRecipient>) => {
    try {
      await api.manager.updateEmailRecipient(recipientId, updates)
      loadData()
    } catch (error) {
      console.error('Failed to update recipient:', error)
      toast({
        title: 'Unable to update recipient',
        description: parseErrorMessage(error, 'Please try again later.'),
        variant: 'destructive'
      })
    }
  }

  const handleRecipientDelete = async (recipientId: string) => {
    try {
      await api.manager.deleteEmailRecipient(recipientId)
      toast({
        title: 'Recipient removed',
        description: 'The email will no longer receive notifications.'
      })
      loadData()
    } catch (error) {
      console.error('Failed to remove recipient:', error)
      toast({
        title: 'Unable to remove recipient',
        description: parseErrorMessage(error, 'Please try again later.'),
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading notification settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <div>
          <h4 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notification Preferences
          </h4>
          <p className="text-sm text-muted-foreground">
            Choose which automated notifications you would like to receive.
          </p>
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New applications</p>
              <p className="text-sm text-muted-foreground">Receive an email when a new application is submitted.</p>
            </div>
            <Switch
              checked={preferences.applications}
              disabled={savingPrefs}
              onCheckedChange={(value) => handlePreferenceToggle('applications', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Approvals & decisions</p>
              <p className="text-sm text-muted-foreground">Get notified when application statuses change.</p>
            </div>
            <Switch
              checked={preferences.approvals}
              disabled={savingPrefs}
              onCheckedChange={(value) => handlePreferenceToggle('approvals', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reminders</p>
              <p className="text-sm text-muted-foreground">Receive reminders about pending reviews or deadlines.</p>
            </div>
            <Switch
              checked={preferences.reminders}
              disabled={savingPrefs}
              onCheckedChange={(value) => handlePreferenceToggle('reminders', value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Additional email recipients
            </h4>
            <p className="text-sm text-muted-foreground">
              Add colleagues who should receive application notifications for this property.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddRecipient} className="grid gap-3 md:grid-cols-3">
          <Input
            type="email"
            placeholder="Email address"
            value={newRecipientEmail}
            onChange={(event) => setNewRecipientEmail(event.target.value)}
            required
            className="md:col-span-1"
          />
          <Input
            type="text"
            placeholder="Name (optional)"
            value={newRecipientName}
            onChange={(event) => setNewRecipientName(event.target.value)}
            className="md:col-span-1"
          />
          <Button type="submit" disabled={submittingRecipient} className="md:col-span-1">
            {submittingRecipient ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Add recipient
              </>
            )}
          </Button>
        </form>

        {formError && (
          <p className="text-sm text-destructive">{formError}</p>
        )}

        <Separator />

        {recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No additional recipients have been added yet.
          </p>
        ) : (
          <div className="space-y-3">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{recipient.name || recipient.email}</p>
                  <p className="text-sm text-muted-foreground">{recipient.email}</p>
                  {!recipient.is_active && (
                    <Badge variant="secondary" className="mt-1">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <Switch
                      checked={recipient.is_active !== false}
                      onCheckedChange={(value) =>
                        handleRecipientUpdate(recipient.id, { is_active: value })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Send emails</span>
                    <Switch
                      checked={recipient.receives_applications !== false}
                      onCheckedChange={(value) =>
                        handleRecipientUpdate(recipient.id, { receives_applications: value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRecipientDelete(recipient.id)}
                    title="Remove recipient"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Recipients marked as inactive remain on the list but will not appear in future notification selections until reactivated.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManagerNotificationSettings
