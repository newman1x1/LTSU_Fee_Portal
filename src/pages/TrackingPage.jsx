import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import PageWrapper from '../components/layout/PageWrapper'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../utils/formatters'

function DetailRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: color || 'var(--color-text)' }}>{value || '—'}</span>
    </div>
  )
}

export default function TrackingPage() {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [trackCount, setTrackCount] = useState(0)
  const [trackCooldown, setTrackCooldown] = useState(false)

  const handleTrack = async () => {
    if (trackCooldown) {
      setError('Too many lookups. Please wait 30 seconds.')
      return
    }
    const trimmed = token.trim().toUpperCase()
    if (!trimmed) {
      setError('Please enter a reference number')
      return
    }
    if (!/^LTSU-\d{4}-\d{5}$/.test(trimmed)) {
      setError('Invalid format. Expected: LTSU-YYYY-XXXXX')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setTrackCount(prev => {
      const next = prev + 1
      if (next >= 5) {
        setTrackCooldown(true)
        setTimeout(() => { setTrackCooldown(false); setTrackCount(0) }, 30_000)
      }
      return next
    })

    try {
      const { data, error: rpcErr } = await supabase.rpc('track_fee_request', {
        p_reference_number: trimmed,
      })

      if (rpcErr) throw rpcErr

      if (!data || data.length === 0) {
        setError('No request found with this reference number')
        return
      }

      setResult(data[0])
    } catch (err) {
      setError(err.message || 'Failed to track request')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReceipt = async () => {
    if (!result) return
    try {
      const { generateReceipt } = await import('../utils/generateReceipt')
      const receiptData = {
        referenceNumber: result.reference_number,
        approvedDate: formatDate(result.reviewed_at),
        studentName: result.student_name,
        rollNumber: result.roll_number,
        batchYear: result.batch_year,
        branchName: result.branch_name,
        specialisationName: result.specialisation_name,
        sectionName: result.section_name,
        semesterName: result.semester_name,
        feeAmount: result.fee_amount,
        approvedByName: result.reviewed_by_name || 'N/A',
        approvedByRole: result.reviewed_by_role || 'staff',
      }
      const doc = await generateReceipt(receiptData)
      doc.save(`LTSU_Receipt_${result.reference_number}.pdf`)
    } catch (err) {
      console.error('Failed to generate receipt:', err)
    }
  }

  const statusConfig = {
    pending: { label: 'Pending Review', color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
    approved: { label: 'Approved', color: 'var(--color-success)', bg: 'rgba(34,197,94,0.10)' },
    rejected: { label: 'Rejected', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.10)' },
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <PageWrapper maxWidth={560}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-text)' }}>
            Track Request
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Enter your reference number to check status
          </p>
        </div>

        <GlassCard style={{ padding: 32 }}>
          <Input
            label="Reference Number"
            value={token}
            onChange={e => { setToken(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleTrack()}
            placeholder="e.g. LTSU-2026-00001"
            error={error}
            style={{ fontFamily: 'monospace' }}
          />
          <Button
            onClick={handleTrack}
            loading={loading}
            disabled={!token.trim()}
            style={{ width: '100%', marginTop: 8 }}
          >
            Track Status
          </Button>

          {result && (
            <div style={{ marginTop: 24 }}>
              <div style={{ width: '100%', height: 1, background: 'var(--color-gold)', marginBottom: 24 }} />

              <div style={{
                display: 'flex', justifyContent: 'center', marginBottom: 20,
              }}>
                <span style={{
                  padding: '6px 20px',
                  borderRadius: 999,
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  background: statusConfig[result.status]?.bg,
                  color: statusConfig[result.status]?.color,
                }}>
                  {statusConfig[result.status]?.label}
                </span>
              </div>

              <div style={{
                background: 'var(--color-gold-pale)',
                borderRadius: 8,
                padding: '12px 16px',
                border: '1px solid rgba(201,168,76,0.2)',
              }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                  Request Details
                </p>
                <DetailRow label="Reference" value={result.reference_number} />
                <DetailRow label="Student Name" value={result.student_name} />
                <DetailRow label="Roll Number" value={result.roll_number} />
                <DetailRow label="Branch" value={result.branch_name} />
                <DetailRow label="Specialisation" value={result.specialisation_name} />
                <DetailRow label="Section" value={result.section_name} />
                <DetailRow label="Semester" value={result.semester_name} />
                <DetailRow label="Batch Year" value={result.batch_year} />
                <DetailRow label="Fee Amount" value={formatCurrency(result.fee_amount)} color="var(--color-navy)" />
                <DetailRow label="Submitted" value={formatDate(result.submitted_at)} />
                {result.reviewed_at && (
                  <DetailRow label="Reviewed" value={formatDate(result.reviewed_at)} />
                )}
              </div>

              {result.status === 'rejected' && result.rejection_reason && (
                <div style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Rejection Reason
                  </p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    {result.rejection_reason}
                  </p>
                </div>
              )}

              {result.status === 'rejected' && (
                <div style={{ marginTop: 16 }}>
                  <Button onClick={() => navigate('/submit')} style={{ width: '100%' }}>
                    Resubmit Request
                  </Button>
                </div>
              )}

              {result.status === 'approved' && (
                <div style={{ marginTop: 16 }}>
                  <Button onClick={handleDownloadReceipt} variant="secondary" style={{ width: '100%' }}>
                    Download Receipt (PDF)
                  </Button>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </PageWrapper>
    </div>
  )
}
