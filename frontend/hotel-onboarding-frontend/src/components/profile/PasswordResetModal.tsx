import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { Lock, AlertCircle } from 'lucide-react'
import type { AxiosError } from 'axios'

interface PasswordResetModalProps {
  open: boolean
  onClose: () => void
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ open, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      setLoading(true)
      setError('')

      await api.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      })

      toast({
        title: 'Success',
        description: 'Password updated successfully'
      })
      onClose()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string; error?: string }>
      const apiMessage = axiosError.response?.data?.detail || axiosError.response?.data?.error
      setError(apiMessage || axiosError.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Change Password
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="current">Current Password</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new">New Password</Label>
            <Input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              required
              minLength={8}
            />
            {newPassword && newPassword.length < 8 && (
              <p className="text-sm text-red-500">
                Password must be at least 8 characters long
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm New Password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-500">
                Passwords do not match
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !currentPassword || !newPassword || !confirmPassword}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PasswordResetModal
