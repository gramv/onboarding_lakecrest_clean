import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  Send,
  Mail,
  Link as LinkIcon,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Settings
} from 'lucide-react'
import { format } from 'date-fns'
import { apiClient, api } from '@/services/api'
import { getApiUrl } from '@/config/api'

interface OutletContextValue {
  onStatsUpdate: () => void
}

interface PropertySummary {
  id: string
  name: string
  city?: string
  state?: string
}

interface StepInvitation {
  id: string
  step_id: string
  step_name: string
  recipient_email: string
  recipient_name?: string
  employee_id?: string
  property_id?: string
  sent_by?: string
  sent_at?: string
  completed_at?: string | null
  status?: string
  session_id?: string | null
  invitation_link?: string
}

const STEP_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'personal-info', label: 'Personal Information', description: 'Employee details, emergency contacts, tax profile' },
  { value: 'company-policies', label: 'Company Policies', description: 'Acknowledge required policies and handbook' },
  { value: 'i9-complete', label: 'I-9 Section 2', description: 'Employment eligibility verification for HR/Managers' },
  { value: 'w4-form', label: 'W-4 Form', description: 'Federal tax withholding form' },
  { value: 'direct-deposit', label: 'Direct Deposit', description: 'Banking details and signature packet' },
  { value: 'trafficking-awareness', label: 'Human Trafficking Awareness', description: 'State compliance acknowledgement' },
  { value: 'weapons-policy', label: 'Weapons Policy', description: 'Weapons policy acknowledgement with signature' },
  { value: 'health-insurance', label: 'Health Insurance', description: 'Coverage selection and acknowledgements' }
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' }
]

const StepInvitationsTab: React.FC = () => {
  const outletContext = useOutletContext<OutletContextValue | undefined>()
  const { toast } = useToast()

  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [invitations, setInvitations] = useState<StepInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [sending, setSending] = useState(false)
  const [filters, setFilters] = useState({
    propertyId: 'all',
    status: 'all'
  })

  const [form, setForm] = useState({
    stepId: STEP_OPTIONS[0]?.value ?? 'personal-info',
    propertyId: '',
    recipientEmail: '',
    recipientName: ''
  })

  // Email recipients management state
  const [emailRecipients, setEmailRecipients] = useState<string[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [savingRecipients, setSavingRecipients] = useState(false)
  const [newRecipientEmail, setNewRecipientEmail] = useState('')
  const [recipientError, setRecipientError] = useState('')
  const [showRecipientsSection, setShowRecipientsSection] = useState(false)

  const filteredInvitations = useMemo(() => {
    return invitations.filter(invite => {
      const matchesProperty = filters.propertyId === 'all' || invite.property_id === filters.propertyId
      const status = (invite.status || (invite.completed_at ? 'completed' : 'pending')).toLowerCase()
      const matchesStatus = filters.status === 'all' || status === filters.status
      return matchesProperty && matchesStatus
    })
  }, [invitations, filters])

  useEffect(() => {
    fetchProperties()
    fetchEmailRecipients()
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [filters])

  const fetchProperties = async () => {
    setLoadingProperties(true)
    try {
      const response = await api.hr.getProperties()
      const list: PropertySummary[] = Array.isArray(response.data) ? response.data : []
      setProperties(list)

      if (!form.propertyId && list.length > 0) {
        setForm(prev => ({ ...prev, propertyId: list[0].id }))
      }
    } catch (error) {
      console.error('Failed to load properties', error)
      toast({ title: 'Unable to load properties', description: 'Property list is required to send invitations.', variant: 'destructive' })
    } finally {
      setLoadingProperties(false)
    }
  }

  const fetchInvitations = async () => {
    setLoadingInvitations(true)
    try {
      const response = await apiClient.get('/hr/step-invitations', {
        params: {
          property_id: filters.propertyId !== 'all' ? filters.propertyId : undefined,
          status: filters.status !== 'all' ? filters.status : undefined
        }
      })

      const data = Array.isArray(response.data?.data) ? response.data.data : Array.isArray(response.data) ? response.data : []
      setInvitations(data)
    } catch (error) {
      console.error('Failed to fetch step invitations', error)
      toast({ title: 'Unable to load invitations', description: 'Please try refreshing in a moment.', variant: 'destructive' })
    } finally {
      setLoadingInvitations(false)
    }
  }

  const resetForm = () => {
    setForm(prev => ({
      stepId: STEP_OPTIONS[0]?.value ?? 'personal-info',
      propertyId: properties[0]?.id ?? prev.propertyId,
      recipientEmail: '',
      recipientName: ''
    }))
  }

  const handleSendInvitation = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.propertyId) {
      toast({ title: 'Select a property', description: 'A property is required for single-step invitations.', variant: 'destructive' })
      return
    }
    if (!form.recipientEmail) {
      toast({ title: 'Recipient email required', description: 'Enter an email address for the recipient.', variant: 'destructive' })
      return
    }

    setSending(true)
    try {
      const payload = {
        step_id: form.stepId,
        property_id: form.propertyId,
        recipient_email: form.recipientEmail.trim(),
        recipient_name: form.recipientName.trim() || undefined
      }

      const response = await apiClient.post('/hr/send-step-invitation', payload)
      const returned = response.data?.data || {}

      toast({
        title: 'Invitation sent',
        description: `We emailed ${payload.recipient_email} a link to complete ${returned.step_name ?? payload.step_id}.`
      })

      await fetchInvitations()
      outletContext?.onStatsUpdate()
      resetForm()
    } catch (error: any) {
      console.error('Failed to send step invitation', error)
      const description = error?.response?.data?.message || error?.message || 'The invitation could not be sent.'
      toast({ title: 'Send failed', description, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleCopyLink = (invitation: StepInvitation) => {
    const link = invitation.invitation_link
      || (invitation.session_id ? `${getApiUrl().replace(/\/api$/, '')}/onboard?token=${encodeURIComponent(invitation.session_id)}` : null)

    if (!link) {
      toast({ title: 'No link available', description: 'This invitation does not include a shareable link yet.', variant: 'destructive' })
      return
    }

    navigator.clipboard.writeText(link).then(() => {
      toast({ title: 'Link copied', description: 'Invitation link copied to clipboard.' })
    }).catch(err => {
      console.error('Clipboard error', err)
      toast({ title: 'Copy failed', description: 'Unable to copy the invitation link.', variant: 'destructive' })
    })
  }

  const handleResend = async (invitation: StepInvitation) => {
    try {
      setSending(true)
      await apiClient.post('/hr/send-step-invitation', {
        step_id: invitation.step_id,
        property_id: invitation.property_id,
        recipient_email: invitation.recipient_email,
        recipient_name: invitation.recipient_name,
        employee_id: invitation.employee_id
      })
      toast({ title: 'Invitation resent', description: `Resent to ${invitation.recipient_email}.` })
      await fetchInvitations()
    } catch (error: any) {
      console.error('Failed to resend invitation', error)
      const description = error?.response?.data?.message || error?.message || 'Could not resend this invitation.'
      toast({ title: 'Resend failed', description, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const statusBadge = (invitation: StepInvitation) => {
    const status = (invitation.status || (invitation.completed_at ? 'completed' : 'pending')).toLowerCase()
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Completed</Badge>
      case 'expired':
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Expired</Badge>
      case 'pending':
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  // Email Recipients Management Functions
  const fetchEmailRecipients = async () => {
    setLoadingRecipients(true)
    try {
      const response = await apiClient.get('/hr/email-recipients/global')
      // Note: apiClient interceptor unwraps response.data.data automatically
      // So response.data is now the unwrapped data: {emails: [...]}
      const emails = response.data?.emails || []
      setEmailRecipients(emails)
    } catch (error: any) {
      console.error('Failed to fetch email recipients:', error)
      // Don't show toast error during save operation - just log it
      if (!savingRecipients) {
        toast({
          title: 'Failed to load email recipients',
          description: 'Unable to load notification recipients',
          variant: 'destructive'
        })
      }
    } finally {
      setLoadingRecipients(false)
    }
  }

  const validateRecipientEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const addEmailRecipient = () => {
    const email = newRecipientEmail.trim().toLowerCase()

    if (!email) {
      setRecipientError('Email address is required')
      return
    }

    if (!validateRecipientEmail(email)) {
      setRecipientError('Please enter a valid email address')
      return
    }

    if (emailRecipients.includes(email)) {
      setRecipientError('This email address is already in the list')
      return
    }

    setEmailRecipients(prev => [...prev, email])
    setNewRecipientEmail('')
    setRecipientError('')

    toast({
      title: 'Email added',
      description: `${email} will receive completion notifications`
    })
  }

  const removeEmailRecipient = (emailToRemove: string) => {
    setEmailRecipients(prev => prev.filter(email => email !== emailToRemove))

    toast({
      title: 'Email removed',
      description: `${emailToRemove} removed from notifications`
    })
  }

  const saveEmailRecipients = async () => {
    setSavingRecipients(true)
    try {
      const response = await apiClient.post('/hr/email-recipients/global', {
        emails: emailRecipients
      })

      // Note: apiClient interceptor unwraps response.data.data automatically
      // So response.data is now the unwrapped data: {saved: true, count: N}
      if (response.data?.saved) {
        toast({
          title: 'Recipients saved',
          description: `${emailRecipients.length} recipients will receive notifications`
        })
        // Refresh the list, but don't let refresh errors affect the save success
        try {
          await fetchEmailRecipients()
        } catch (refreshError) {
          console.warn('Failed to refresh recipients after save:', refreshError)
          // Save was successful, just refresh failed - not a critical error
        }
      } else {
        throw new Error('Failed to save recipients')
      }
    } catch (error: any) {
      console.error('Failed to save email recipients:', error)
      toast({
        title: 'Failed to save recipients',
        description: error?.response?.data?.message || error?.message || 'Unable to save recipients',
        variant: 'destructive'
      })
    } finally {
      setSavingRecipients(false)
    }
  }

  const handleRecipientKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addEmailRecipient()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5" />
            Send Single-Step Invitation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvitation} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Step</label>
              <Select value={form.stepId} onValueChange={value => setForm(prev => ({ ...prev, stepId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a step" />
                </SelectTrigger>
                <SelectContent>
                  {STEP_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <Select
                value={form.propertyId}
                onValueChange={value => setForm(prev => ({ ...prev, propertyId: value }))}
                disabled={loadingProperties || properties.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProperties ? 'Loading properties…' : 'Select a property'} />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                      {property.city ? ` • ${property.city}${property.state ? `, ${property.state}` : ''}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Email</label>
              <Input
                type="email"
                required
                value={form.recipientEmail}
                onChange={event => setForm(prev => ({ ...prev, recipientEmail: event.target.value }))}
                placeholder="employee@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Recipient Name <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <Input
                value={form.recipientName}
                onChange={event => setForm(prev => ({ ...prev, recipientName: event.target.value }))}
                placeholder="Employee name"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={sending || loadingProperties}>
                {sending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Send Invitation
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} disabled={sending}>
                Clear
              </Button>
              <Alert className="md:flex-1 border border-blue-200 bg-blue-50">
                <AlertDescription className="text-xs md:text-sm text-blue-700">
                  Single-step invitations let you collect specific forms without restarting the entire onboarding flow.
                </AlertDescription>
              </Alert>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Recent Invitations</CardTitle>
            <p className="text-sm text-muted-foreground">Track delivery status and completions for each single-step request.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={filters.propertyId}
              onValueChange={value => setFilters(prev => ({ ...prev, propertyId: value }))}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={value => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchInvitations} disabled={loadingInvitations}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingInvitations ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loadingInvitations ? (
            <div className="py-10 text-center text-muted-foreground">Loading invitations…</div>
          ) : filteredInvitations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No invitations match your filters yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map(invitation => {
                  const property = properties.find(p => p.id === invitation.property_id)
                  const sentAt = invitation.sent_at ? format(new Date(invitation.sent_at), 'MMM d, yyyy p') : '—'
                  const completedAt = invitation.completed_at ? format(new Date(invitation.completed_at), 'MMM d, yyyy p') : null

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{invitation.recipient_name || 'Unnamed recipient'}</span>
                          <span className="text-xs text-muted-foreground">{invitation.recipient_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-sm">{invitation.step_name || invitation.step_id}</span>
                          <Badge variant="outline" className="w-max text-xs">{invitation.step_id}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{property?.name || '—'}</span>
                          <span className="text-xs text-muted-foreground">{property?.city ? `${property.city}${property.state ? `, ${property.state}` : ''}` : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {sentAt}</span>
                          {completedAt && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Clock className="h-3 w-3" /> Completed {completedAt}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(invitation)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleCopyLink(invitation)}>
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleResend(invitation)} disabled={sending}>
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Email Recipients Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <div>
                <CardTitle className="text-lg">Notification Recipients</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage who receives emails when documents are completed
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecipientsSection(!showRecipientsSection)}
            >
              {showRecipientsSection ? 'Hide' : 'Manage'}
            </Button>
          </div>
        </CardHeader>

        {showRecipientsSection && (
          <CardContent className="space-y-4">
            {/* Add New Recipient */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter email address to receive notifications"
                  value={newRecipientEmail}
                  onChange={(e) => {
                    setNewRecipientEmail(e.target.value)
                    setRecipientError('')
                  }}
                  onKeyPress={handleRecipientKeyPress}
                  className={recipientError ? 'border-red-500' : ''}
                />
                {recipientError && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {recipientError}
                  </p>
                )}
              </div>
              <Button
                onClick={addEmailRecipient}
                disabled={!newRecipientEmail.trim() || !!recipientError}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Current Recipients List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Current Recipients ({emailRecipients.length})
                </p>
                <Button
                  onClick={saveEmailRecipients}
                  disabled={savingRecipients || emailRecipients.length === 0}
                  size="sm"
                >
                  {savingRecipients ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>

              {loadingRecipients ? (
                <div className="py-4 text-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Loading recipients...
                </div>
              ) : emailRecipients.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notification recipients configured</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {emailRecipients.map((email, index) => (
                    <div key={email} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{email}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeEmailRecipient(email)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Alert className="border border-blue-200 bg-blue-50">
              <Users className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                These recipients will receive email notifications with PDF attachments when employees complete any onboarding documents.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Alert variant="default">
        <AlertDescription className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">How single-step invitations work</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li>Employees receive a secure link to complete the specific step you select.</li>
              <li>Completed paperwork is automatically attached to their onboarding record.</li>
              <li>Invitations expire after 7 days; resending generates a new token.</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default StepInvitationsTab
