import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import PageWrapper from '../components/layout/PageWrapper'
import GlassCard from '../components/ui/GlassCard'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { logAction } from '../utils/logAction'
import { sanitizeRollNumber, isValidEmail } from '../utils/validators'
import { formatCurrency } from '../utils/formatters'

function ProgressIndicator({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: step >= 1 ? 'var(--color-navy)' : 'var(--color-border-light)',
        color: step >= 1 ? 'var(--color-gold)' : 'var(--color-text-muted)',
        fontSize: 'var(--text-sm)', fontWeight: 600,
      }}>
        {step > 1 ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : '1'}
      </div>
      <div style={{ width: 60, height: 2, background: step > 1 ? 'var(--color-gold)' : 'var(--color-border-light)' }} />
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: step >= 2 ? 'var(--color-navy)' : 'var(--color-border-light)',
        color: step >= 2 ? 'var(--color-gold)' : 'var(--color-text-muted)',
        fontSize: 'var(--text-sm)', fontWeight: 600,
      }}>
        2
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>{value || '—'}</span>
    </div>
  )
}

export default function StudentFormPage() {
  const { activeBatches, branches, specialisations, sections } = useData()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [countdown, setCountdown] = useState(180)

  useEffect(() => {
    if (!submitted) return
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted, navigate])
  const [submitting, setSubmitting] = useState(false)
  const lastRollLookup = useRef('')
  const lastSubmitTime = useRef(0)

  // Step 1
  const [email, setEmail] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [rollStatus, setRollStatus] = useState(null) // null | 'loading' | 'found' | 'not_found'
  const [studentData, setStudentData] = useState(null)
  const [emailError, setEmailError] = useState('')

  const [duplicateError, setDuplicateError] = useState('')

  // Derived from studentData
  const batchYear = studentData?.batch_year ? String(studentData.batch_year) : ''
  const branchName = studentData?.branch_id ? (branches || []).find(b => b.id === studentData.branch_id)?.name : ''
  const specName = studentData?.specialisation_id ? (specialisations || []).find(s => s.id === studentData.specialisation_id)?.name : ''
  const studentSection = studentData?.section_id ? (sections || []).find(s => s.id === studentData.section_id) : null
  const sectionName = studentSection?.name || ''
  const semesterName = studentSection?.semesters?.name || ''
  const feeAmount = batchYear ? (activeBatches.find(b => String(b.batch_year) === batchYear)?.fee_amount || null) : null

  const handleRollBlur = async () => {
    const cleaned = sanitizeRollNumber(rollNumber)
    if (!cleaned || cleaned === lastRollLookup.current) return
    setRollStatus('loading')
    try {
      const { data } = await supabase
        .from('students')
        .select('id, full_name, roll_number, branch_id, specialisation_id, section_id, batch_year')
        .eq('roll_number', cleaned)
        .single()

      if (data) {
        setStudentData(data)
        setRollStatus('found')
        lastRollLookup.current = cleaned
      } else {
        setStudentData(null)
        setRollStatus('not_found')
        lastRollLookup.current = cleaned
      }
    } catch {
      setStudentData(null)
      setRollStatus('error')
    }
  }

  const validateStep1 = () => {
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError('')
    if (rollStatus !== 'found') {
      addToast('Please enter a valid roll number', 'error')
      return false
    }
    return true
  }

  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  const handleNext = async () => {
    if (!validateStep1()) return
    setDuplicateError('')
    setCheckingDuplicate(true)
    try {
      const { data, error } = await supabase.rpc('check_duplicate_fee_request', {
        p_student_id: studentData.id,
        p_section_id: studentData.section_id,
      })
      if (error) {
        addToast('Failed to check duplicate request. Please try again.', 'error')
        return
      }
      if (data === 'pending') {
        setDuplicateError('Your fee request for this semester is already submitted and is pending review.')
        return
      }
      if (data === 'approved') {
        setDuplicateError('Your fee request for this semester has already been approved.')
        return
      }
      // 'rejected' or 'none' → allow submission / resubmission
      setStep(2)
    } catch (err) {
      addToast('Failed to check duplicate request. Please try again.', 'error')
    } finally {
      setCheckingDuplicate(false)
    }
  }

  const handleSubmit = async () => {
    if (!feeAmount) {
      addToast('Fee amount not configured for your batch. Contact admin.', 'error')
      return
    }
    const now = Date.now()
    if (now - lastSubmitTime.current < 10_000) {
      addToast('Please wait before submitting again.', 'error')
      return
    }
    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('submit_fee_request', {
        p_student_id: studentData.id,
        p_roll_number: sanitizeRollNumber(rollNumber),
        p_student_email: email.trim(),
        p_section_id: studentData.section_id,
        p_batch_year: Number(batchYear),
        p_fee_amount: Number(feeAmount),
      })

      if (error) throw error

      lastSubmitTime.current = Date.now()
      setReferenceNumber(data)

      await logAction({
        actionType: 'student_submitted',
        performedByRole: 'student',
        performedByName: studentData.full_name,
        performedById: sanitizeRollNumber(rollNumber),
        targetName: studentData.full_name,
        targetRoll: sanitizeRollNumber(rollNumber),
        details: {
          reference: data,
          semester: semesterName,
          fee_amount: Number(feeAmount),
        },
        sectionName,
        branchName,
      })

      setSubmitted(true)
    } catch (err) {
      addToast(err.message || 'Submission failed. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const mins = Math.floor(countdown / 60)
    const secs = countdown % 60
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <PageWrapper maxWidth={560}>
          <GlassCard style={{ padding: 40, textAlign: 'center' }}>
            <h2 className="font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>
              Request Submitted
            </h2>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-light)', marginBottom: 8 }}>
              Your fee submission for {semesterName} has been received.
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 24 }}>
              Your CR or Teacher will review it shortly. You will receive a confirmation at {email}.
            </p>
            <div style={{
              display: 'inline-block',
              padding: '10px 20px',
              border: '1px solid var(--color-gold)',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 'var(--text-md)',
              color: 'var(--color-text)',
              marginBottom: 24,
            }}>
              {referenceNumber}
            </div>
            <div style={{ marginBottom: 24 }}>
              <Button onClick={() => navigate('/')} style={{ width: '100%' }}>
                Go to Homepage
              </Button>
            </div>
            <div style={{ width: '100%', height: 1, background: 'var(--color-gold)', margin: '0 0 24px' }} />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Redirecting to homepage in {mins}:{secs.toString().padStart(2, '0')}
            </p>
          </GlassCard>
        </PageWrapper>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <PageWrapper maxWidth={560}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-text)' }}>
            Fee Submission
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Semester Registration — Academic Year
          </p>
        </div>

        <GlassCard style={{ padding: 32 }}>
          <ProgressIndicator step={step} />

          {step === 1 && (
            <>
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
                error={emailError}
                required
                placeholder="your.email@example.com"
              />
              <Input
                label="Roll Number"
                value={rollNumber}
                onChange={e => { setRollNumber(e.target.value); setRollStatus(null); setStudentData(null); setDuplicateError('') }}
                onBlur={handleRollBlur}
                loading={rollStatus === 'loading'}
                success={rollStatus === 'found' ? `Found: ${studentData?.full_name}` : undefined}
                error={rollStatus === 'not_found' ? 'This roll number is not registered in our system.' : rollStatus === 'error' ? 'Failed to look up roll number. Please try again.' : undefined}
                required
                placeholder="e.g. 24100110007"
              />

              {rollStatus === 'found' && studentData && (
                <div style={{
                  background: 'var(--color-gold-pale)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 16,
                  border: '1px solid rgba(201,168,76,0.2)',
                }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                    Student Details (Auto-filled)
                  </p>
                  <DetailRow label="Branch" value={branchName} />
                  <DetailRow label="Specialisation" value={specName} />
                  <DetailRow label="Section" value={sectionName} />
                  <DetailRow label="Semester" value={semesterName} />
                  <DetailRow label="Batch Year" value={batchYear} />
                  {feeAmount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Fee Amount</span>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-navy)' }}>{formatCurrency(feeAmount)}</span>
                    </div>
                  )}
                </div>
              )}

              {duplicateError && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'rgba(217,119,6,0.08)',
                  border: '1px solid rgba(217,119,6,0.2)',
                  marginBottom: 12,
                }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: '#b45309', fontWeight: 500 }}>
                    {duplicateError}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Use the <a href="/track" style={{ color: 'var(--color-gold)', fontWeight: 500 }}>Track Request</a> page to check your request status.
                  </p>
                </div>
              )}

              <Button onClick={handleNext} disabled={rollStatus !== 'found' || checkingDuplicate} loading={checkingDuplicate} style={{ width: '100%', marginTop: 8 }}>
                {checkingDuplicate ? 'Checking...' : 'Next'}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{
                background: 'rgba(11,27,62,0.03)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 20,
                border: '1px solid var(--color-border-light)',
              }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                  Submitting for
                </p>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                  {studentData?.full_name} — {sanitizeRollNumber(rollNumber)}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {branchName} · {specName} · {sectionName} · {semesterName} · Batch {batchYear}
                </p>
              </div>

              {feeAmount && (
                <div style={{
                  background: 'var(--color-gold-pale)',
                  color: 'var(--color-navy)',
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  marginBottom: 16,
                }}>
                  Fee for {semesterName}: {formatCurrency(feeAmount)}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  className="btn-ghost"
                  onClick={() => setStep(1)}
                  style={{ padding: '12px 0' }}
                >
                  Back
                </button>
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </>
          )}
        </GlassCard>
      </PageWrapper>
    </div>
  )
}
