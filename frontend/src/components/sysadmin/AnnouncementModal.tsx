import { useState } from 'react'
import { messageApi } from '@/api/messages'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'

interface AnnouncementModalProps {
  onClose: () => void
}

export default function AnnouncementModal({ onClose }: AnnouncementModalProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody]       = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState('')
  const [sentCount, setSentCount] = useState<number | null>(null)

  async function handleSend() {
    if (!body.trim()) { setError('Message body is required.'); return }
    setError('')
    setSending(true)
    try {
      const res = await messageApi.compose({
        subject: subject.trim() || undefined,
        body: body.trim(),
        recipient_type: 'broadcast',
      })
      setSentCount(res.data.recipient_count)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Failed to send announcement.')
    } finally {
      setSending(false)
    }
  }

  if (sentCount !== null) {
    return (
      <Modal title="Announcement Sent" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--sp-text)]">
            Delivered to <span className="font-semibold">{sentCount}</span> user{sentCount === 1 ? '' : 's'} — it's now in their inbox and notifications.
          </p>
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="System-Wide Announcement" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--sp-text-muted)]">
          Sends a message to every active user's inbox and notification bell.
        </p>
        <FormField label="Subject">
          <input value={subject} onChange={e => setSubject(e.target.value)}
            className="input-field" placeholder="e.g. Scheduled maintenance tonight" />
        </FormField>
        <FormField label="Message" required>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
            className="input-field resize-none w-full" placeholder="Write your announcement…" />
        </FormField>
        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 sp-squircle-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !body.trim()}>
            {sending ? 'Sending…' : 'Send to Everyone'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
