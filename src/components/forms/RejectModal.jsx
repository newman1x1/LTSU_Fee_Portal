import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function RejectModal({ isOpen, onClose, studentName, rollNumber, onConfirm, loading }) {
  const [reason, setReason] = useState('')

  // Reset reason when modal opens to prevent stale text
  useEffect(() => { if (isOpen) setReason('') }, [isOpen])

  const handleConfirm = () => {
    if (loading) return
    if (reason.trim().length >= 10) {
      onConfirm(reason.trim())
      setReason('')
    }
  }

  const handleClose = () => {
    setReason('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reject Fee Request">
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-light)' }}>
          <strong>{studentName}</strong> ({rollNumber})
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="input-label">Reason for rejection</label>
        <textarea
          className="input-field"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Please explain the reason (minimum 10 characters)..."
          rows={4}
          maxLength={500}
          style={{ resize: 'vertical', fontFamily: "'DM Sans', sans-serif" }}
        />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
          {reason.trim().length}/10 characters minimum
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={reason.trim().length < 10}
          loading={loading}
        >
          Confirm Rejection
        </Button>
      </div>
    </Modal>
  )
}
