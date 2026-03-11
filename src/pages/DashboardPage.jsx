import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useFeeRequests } from '../hooks/useFeeRequests'
import { useDebounce } from '../hooks/useDebounce'
import { supabase } from '../lib/supabase'
import { logAction } from '../utils/logAction'
import { formatCurrency, formatDate, getGreeting } from '../utils/formatters'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import MobileNav from '../components/layout/MobileNav'
import StatsCard from '../components/ui/StatsCard'
import Tabs from '../components/ui/Tabs'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import SectionSwitcher from '../components/dashboard/SectionSwitcher'
import ExportMenu from '../components/dashboard/ExportMenu'
import RejectModal from '../components/forms/RejectModal'
import { Users, FileText, Clock, IndianRupee, Search, GraduationCap, CheckCircle, XCircle } from 'lucide-react'

export default function DashboardPage() {
  const { profile, sections: userSections } = useAuth()
  const { addToast } = useToast()

  const [activeSection, setActiveSection] = useState(
    profile?.role === 'teacher' ? 'all' : (userSections[0]?.id || 'all')
  )
  const [activeTab, setActiveTab] = useState('students')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(0)
  const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 767px)').matches)
  const [rejectModal, setRejectModal] = useState({ open: false, request: null })
  const [actionLoading, setActionLoading] = useState(null)
  const [batchProgress, setBatchProgress] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const processingRef = useRef(new Set())

  // Sync activeSection when userSections loads (fixes stale 'all' default for CRs)
  useEffect(() => {
    if (profile?.role !== 'teacher' && userSections.length === 1) {
      setActiveSection(userSections[0].id)
    }
  }, [userSections, profile?.role])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const debouncedSearch = useDebounce(search)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const handleChange = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const sectionIds = activeSection === 'all'
    ? userSections.map(s => s.id)
    : [activeSection]

  const { requests, students, studentCount, loading, refetch } = useFeeRequests(sectionIds)

  const filtered = useMemo(() => {
    let result = requests.filter(r => r.status === activeTab)

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(r =>
        r.students?.full_name?.toLowerCase().includes(q) ||
        r.roll_number?.toLowerCase().startsWith(q)
      )
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.submitted_at) - new Date(b.submitted_at)
        case 'name_az': return (a.students?.full_name || '').localeCompare(b.students?.full_name || '')
        case 'name_za': return (b.students?.full_name || '').localeCompare(a.students?.full_name || '')
        case 'roll': return (a.roll_number || '').localeCompare(b.roll_number || '')
        case 'amount_desc': return Number(b.fee_amount) - Number(a.fee_amount)
        default: return new Date(b.submitted_at) - new Date(a.submitted_at)
      }
    })

    return result
  }, [requests, activeTab, debouncedSearch, sortBy])

  /* ---------- Set of student IDs who have at least one approved fee request ---------- */
  const paidStudentIds = useMemo(() => {
    const ids = new Set()
    requests.forEach(r => { if (r.status === 'approved') ids.add(r.student_id) })
    return ids
  }, [requests])

  /* ---------- filtered student list for Students tab ---------- */
  const filteredStudents = useMemo(() => {
    let result = students.map(s => ({ ...s, isPaid: paidStudentIds.has(s.id) }))

    if (paymentFilter === 'paid') result = result.filter(s => s.isPaid)
    else if (paymentFilter === 'unpaid') result = result.filter(s => !s.isPaid)

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(s =>
        s.full_name?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().startsWith(q)
      )
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_az': return (a.full_name || '').localeCompare(b.full_name || '')
        case 'name_za': return (b.full_name || '').localeCompare(a.full_name || '')
        default: return (a.roll_number || '').localeCompare(b.roll_number || '')
      }
    })
    return result
  }, [students, paidStudentIds, paymentFilter, debouncedSearch, sortBy])

  const activeList = activeTab === 'students' ? filteredStudents : filtered
  const pageSize = 25
  const paged = activeList.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(activeList.length / pageSize)

  const pendingOnPage = activeTab === 'pending' ? paged : []
  const allPageSelected = pendingOnPage.length > 0 && pendingOnPage.every(r => selectedIds.has(r.id))
  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        pendingOnPage.forEach(r => next.delete(r.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        pendingOnPage.forEach(r => next.add(r.id))
        return next
      })
    }
  }

  const { counts, totalCollected } = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 }
    let collected = 0
    for (const r of requests) {
      if (r.status in c) c[r.status]++
      if (r.status === 'approved') collected += Number(r.fee_amount)
    }
    return { counts: c, totalCollected: collected }
  }, [requests])

  const handleApprove = async (req) => {
    if (!profile) return addToast('Session expired. Please re-login.', 'error')
    if (processingRef.current.has(req.id)) return
    if (!window.confirm(`Approve fee request for ${req.students?.full_name} (${req.roll_number})?`)) return

    processingRef.current.add(req.id)
    setActionLoading(req.id)

    let emailFailed = false
    try {
      const { error, count } = await supabase
        .from('fee_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
        })
        .eq('id', req.id)
        .eq('status', 'pending')
        .select('id', { count: 'exact' })

      if (error) throw error
      if (count === 0) {
        addToast('Request already processed by another reviewer.', 'warning')
        refetch()
        return
      }

      const receiptData = {
        referenceNumber: req.reference_number,
        approvedDate: formatDate(new Date().toISOString()),
        studentName: req.students?.full_name,
        rollNumber: req.roll_number,
        batchYear: req.batch_year,
        branchName: req.students?.branches?.name,
        specialisationName: req.students?.specialisations?.name,
        sectionName: req.students?.sections?.name,
        semesterName: req.semesters?.name,
        feeAmount: req.fee_amount,
        approvedByName: profile.full_name,
        approvedByRole: profile.role,
      }

      const doc = await import('../utils/generateReceipt').then(m => m.generateReceipt(receiptData))

      try {
        const emailjs = await import('@emailjs/browser').then(m => m.default)
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_APPROVAL_TEMPLATE_ID,
          {
            to_email: req.student_email,
            student_name: req.students?.full_name,
            reference_number: req.reference_number,
            roll_number: req.roll_number,
            branch_name: req.students?.branches?.name,
            specialisation_name: req.students?.specialisations?.name,
            section_name: req.students?.sections?.name,
            batch_year: req.batch_year,
            semester_name: req.semesters?.name,
            fee_amount: req.fee_amount,
            approved_by_name: profile.full_name,
            approved_date: formatDate(new Date().toISOString()),
          }
        )

        await supabase
          .from('fee_requests')
          .update({ receipt_sent: true })
          .eq('id', req.id)

        await logAction({
          actionType: 'receipt_sent',
          performedByRole: 'system',
          performedByName: 'System',
          targetName: req.students?.full_name,
          targetRoll: req.roll_number,
          details: { reference: req.reference_number, email: req.student_email },
        })
      } catch (emailErr) {
        emailFailed = true
        console.error('Email send failed:', emailErr)
      }

      await logAction({
        actionType: 'request_approved',
        performedByRole: profile.role,
        performedByName: profile.full_name,
        performedById: profile.staff_id,
        targetName: req.students?.full_name,
        targetRoll: req.roll_number,
        details: { reference: req.reference_number, semester: req.semesters?.name, amount: req.fee_amount },
        sectionName: req.students?.sections?.name,
        branchName: req.students?.branches?.name,
      })

      addToast(
        emailFailed ? 'Approved but email failed — student was not notified.' : 'Request approved and receipt sent.',
        emailFailed ? 'warning' : 'success'
      )
      setSelectedIds(prev => { const next = new Set(prev); next.delete(req.id); return next })
      refetch()
    } catch (err) {
      addToast(err.message || 'Failed to approve', 'error')
    } finally {
      processingRef.current.delete(req.id)
      setActionLoading(null)
    }
  }

  const handleBatchApprove = async () => {
    if (!profile) return addToast('Session expired. Please re-login.', 'error')
    const selectedRequests = requests.filter(r => selectedIds.has(r.id) && r.status === 'pending')
    if (selectedRequests.length === 0) return
    if (selectedRequests.length > 25) {
      addToast('Maximum 25 requests per batch. Please deselect some.', 'error')
      return
    }
    if (!window.confirm(`Approve ${selectedRequests.length} request(s)?`)) return

    setActionLoading('batch')
    try {
      const { error } = await supabase.rpc('batch_approve_requests', {
        request_ids: selectedRequests.map(r => r.id),
        reviewer_id: profile.id,
        reviewer_name: profile.full_name,
        reviewer_role: profile.role,
        reviewer_staff_id: profile.staff_id,
      })

      if (error) throw error

      const emailjs = await import('@emailjs/browser').then(m => m.default)
      let emailSuccessIds = []
      const total = selectedRequests.length
      for (let i = 0; i < total; i++) {
        const req = selectedRequests[i]
        setBatchProgress(`(${i + 1}/${total})`)
        try {
          await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_APPROVAL_TEMPLATE_ID,
            {
              to_email: req.student_email,
              student_name: req.students?.full_name,
              reference_number: req.reference_number,
              roll_number: req.roll_number,
              branch_name: req.students?.branches?.name,
              specialisation_name: req.students?.specialisations?.name,
              section_name: req.students?.sections?.name,
              batch_year: req.batch_year,
              semester_name: req.semesters?.name,
              fee_amount: req.fee_amount,
              approved_by_name: profile.full_name,
              approved_date: formatDate(new Date().toISOString()),
            }
          )
          emailSuccessIds.push(req.id)
        } catch (emailErr) {
          console.error(`Email failed for ${req.roll_number}:`, emailErr)
        }
        await new Promise(r => setTimeout(r, 200))
      }

      if (emailSuccessIds.length > 0) {
        await supabase
          .from('fee_requests')
          .update({ receipt_sent: true })
          .in('id', emailSuccessIds)
      }

      addToast(`${selectedRequests.length} request(s) approved. ${emailSuccessIds.length} email(s) sent.`, 'success')
      setSelectedIds(new Set())
      refetch()
    } catch (err) {
      addToast(err.message || 'Batch approve failed', 'error')
    } finally {
      setActionLoading(null)
      setBatchProgress('')
    }
  }

  const handleReject = async (reason) => {
    const req = rejectModal.request
    if (!req) return
    if (!profile) return addToast('Session expired. Please re-login.', 'error')
    if (processingRef.current.has(req.id)) return
    processingRef.current.add(req.id)
    setActionLoading(req.id)

    try {
      const { error, count } = await supabase
        .from('fee_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          rejection_reason: reason,
        })
        .eq('id', req.id)
        .eq('status', 'pending')
        .select('id', { count: 'exact' })

      if (error) throw error
      if (count === 0) {
        addToast('Request already processed by another reviewer.', 'warning')
        setRejectModal({ open: false, request: null })
        refetch()
        return
      }

      try {
        const emailjs = await import('@emailjs/browser').then(m => m.default)
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_REJECTION_TEMPLATE_ID,
          {
            to_email: req.student_email,
            student_name: req.students?.full_name,
            reference_number: req.reference_number,
            roll_number: req.roll_number,
            semester_name: req.semesters?.name,
            reviewed_by_name: profile.full_name,
            reviewed_date: formatDate(new Date().toISOString()),
            rejection_reason: reason,
          }
        )

        await logAction({
          actionType: 'rejection_email_sent',
          performedByRole: 'system',
          performedByName: 'System',
          targetName: req.students?.full_name,
          targetRoll: req.roll_number,
          details: { reference: req.reference_number, email: req.student_email },
        })
      } catch (emailErr) {
        console.error('Rejection email failed:', emailErr)
      }

      await logAction({
        actionType: 'request_rejected',
        performedByRole: profile.role,
        performedByName: profile.full_name,
        performedById: profile.staff_id,
        targetName: req.students?.full_name,
        targetRoll: req.roll_number,
        details: { reference: req.reference_number, reason, semester: req.semesters?.name },
        sectionName: req.students?.sections?.name,
        branchName: req.students?.branches?.name,
      })

      addToast('Request rejected and student notified.', 'success')
      setRejectModal({ open: false, request: null })
      setSelectedIds(prev => { const next = new Set(prev); next.delete(req.id); return next })
      refetch()
    } catch (err) {
      addToast(err.message || 'Failed to reject', 'error')
    } finally {
      processingRef.current.delete(req.id)
      setActionLoading(null)
    }
  }

  const getExportData = () => {
    if (activeTab === 'students') {
      const showSection = activeSection === 'all'
      const cols = ['Roll Number', 'Student Name', 'Branch', 'Specialisation']
      if (showSection) cols.push('Section')
      cols.push('Fee Amount', 'Status')
      const rows = filteredStudents.map(s => {
        const base = [s.roll_number, s.full_name, s.branches?.name, s.specialisations?.name]
        if (showSection) base.push(s.sections?.name)
        base.push(s.fee_amount != null ? s.fee_amount : 'N/A')
        base.push(s.isPaid ? 'Paid' : 'Unpaid')
        return base
      })
      return { columns: cols, data: rows }
    }

    const showSection = activeSection === 'all'
    const baseCols = ['Roll Number', 'Student Name', 'Branch', 'Specialisation']
    if (showSection) baseCols.push('Section')
    baseCols.push('Semester', 'Amount')

    const cols = activeTab === 'pending'
      ? [...baseCols, 'Submitted On']
      : activeTab === 'approved'
      ? [...baseCols, 'Approved On', 'Approved By']
      : [...baseCols, 'Rejected On', 'Reason']

    const rows = filtered.map(r => {
      const base = [
        r.roll_number,
        r.students?.full_name,
        r.students?.branches?.name,
        r.students?.specialisations?.name,
      ]
      if (showSection) base.push(r.students?.sections?.name)
      base.push(r.semesters?.name, r.fee_amount)

      if (activeTab === 'pending') return [...base, formatDate(r.submitted_at)]
      if (activeTab === 'approved') return [...base, formatDate(r.reviewed_at), r.reviewer?.full_name]
      return [...base, formatDate(r.reviewed_at), r.rejection_reason]
    })

    return { columns: cols, data: rows }
  }

  if (loading) return <Spinner />

  const mainStyle = isMobile
    ? { padding: '56px 16px 80px' }
    : { marginLeft: 240, padding: '24px 32px' }

  return (
    <div style={{ minHeight: '100vh' }}>
      {isMobile ? <Navbar /> : <Sidebar />}
      {isMobile && <MobileNav />}

      <main style={mainStyle}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--color-text)' }}>
            {getGreeting()}, <span className="font-display" style={{ fontWeight: 600 }}>{profile?.full_name}</span>
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {formatDate(new Date().toISOString())}
          </p>
        </div>

        {(profile?.role === 'teacher' || (profile?.role === 'cr' && userSections.length > 1)) && (
          <SectionSwitcher
            sections={userSections}
            activeSection={activeSection}
            onChange={(id) => { setActiveSection(id); setPage(0); setSelectedIds(new Set()) }}
          />
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}>
          <StatsCard icon={Users} label="Total Students" value={studentCount} borderColor="var(--color-pending)" />
          <StatsCard icon={FileText} label="Submitted" value={counts.pending + counts.approved + counts.rejected} borderColor="var(--color-navy)" />
          <StatsCard icon={Clock} label="Pending" value={counts.pending} borderColor="var(--color-warning)" />
          <StatsCard icon={IndianRupee} label="Total Collected" value={formatCurrency(totalCollected)} borderColor="var(--color-success)" />
        </div>

        <Tabs
          tabs={[
            { id: 'students', label: 'Students', count: studentCount },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'approved', label: 'Approved', count: counts.approved },
            { id: 'rejected', label: 'Rejected', count: counts.rejected },
          ]}
          active={activeTab}
          onChange={(id) => { setActiveTab(id); setPage(0); setSelectedIds(new Set()) }}
        />

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              className="input-field"
              placeholder="Search by name or roll number..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); setSelectedIds(new Set()) }}
              style={{ paddingLeft: 36 }}
            />
          </div>
          {activeTab === 'students' && (
            <select
              className="input-field"
              value={paymentFilter}
              onChange={e => { setPaymentFilter(e.target.value); setPage(0) }}
              style={{ width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 0 : 150 }}
            >
              <option value="all">All Students</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          )}
          <select
            className="input-field"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 0 : 180 }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_az">Name A-Z</option>
            <option value="name_za">Name Z-A</option>
            <option value="roll">Roll Number</option>
            <option value="amount_desc">Amount High to Low</option>
          </select>
          <ExportMenu
            title={activeTab === 'students' ? 'Student List' : `Fee Requests - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            {...getExportData()}
            exportedBy={profile?.full_name}
            sectionName={activeSection === 'all' ? 'All Sections' : userSections.find(s => s.id === activeSection)?.name}
          />
          {activeTab === 'pending' && selectedIds.size > 0 && (
            <Button
              onClick={handleBatchApprove}
              loading={actionLoading === 'batch'}
              disabled={actionLoading === 'batch'}
              style={{ whiteSpace: 'nowrap' }}
            >
              {actionLoading === 'batch' ? `Approving... ${batchProgress}` : `Approve Selected (${selectedIds.size})`}
            </Button>
          )}
        </div>

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeTab === 'students' ? (
              <>
                {paged.map(stu => (
                  <MobileStudentCard key={stu.id} student={stu} showSection={activeSection === 'all'} />
                ))}
                {paged.length === 0 && (
                  <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No students found
                  </div>
                )}
              </>
            ) : (
              <>
                {paged.map(req => (
                  <MobileRequestCard
                    key={req.id}
                    request={req}
                    activeTab={activeTab}
                    showSection={activeSection === 'all'}
                    onApprove={() => handleApprove(req)}
                    onReject={() => setRejectModal({ open: true, request: req })}
                    loading={actionLoading === req.id}
                    selected={selectedIds.has(req.id)}
                    onToggleSelect={() => toggleSelect(req.id)}
                  />
                ))}
                {paged.length === 0 && (
                  <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {activeTab === 'pending' ? 'No pending requests yet. Requests will appear here when students submit fee forms.'
                     : activeTab === 'approved' ? 'No approved requests yet.'
                     : 'No rejected requests yet.'}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {activeTab === 'students' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Roll Number</th>
                    <th style={thStyle}>Student Name</th>
                    <th style={thStyle}>Branch</th>
                    <th style={thStyle}>Specialisation</th>
                    {activeSection === 'all' && <th style={thStyle}>Section</th>}
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((stu, idx) => (
                    <tr key={stu.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <td style={tdStyle}>{page * pageSize + idx + 1}</td>
                      <td style={tdStyle}>{stu.roll_number}</td>
                      <td style={tdStyle}>{stu.full_name}</td>
                      <td style={tdStyle}>{stu.branches?.name}</td>
                      <td style={tdStyle}>{stu.specialisations?.name}</td>
                      {activeSection === 'all' && <td style={tdStyle}>{stu.sections?.name}</td>}
                      <td style={tdStyle}>{stu.fee_amount != null ? formatCurrency(stu.fee_amount) : '—'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 10px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 500,
                          background: stu.isPaid ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                          color: stu.isPaid ? 'var(--color-success)' : 'var(--color-danger)',
                        }}>
                          {stu.isPaid ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {stu.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={activeSection === 'all' ? 8 : 7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                        No students found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    {activeTab === 'pending' && (
                      <th style={{ ...thStyle, width: 40 }}>
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={toggleSelectAll}
                          style={{ cursor: 'pointer', accentColor: 'var(--color-gold)' }}
                        />
                      </th>
                    )}
                    <th style={thStyle}>Roll Number</th>
                    <th style={thStyle}>Student Name</th>
                    <th style={thStyle}>Branch</th>
                    <th style={thStyle}>Spec</th>
                    {activeSection === 'all' && <th style={thStyle}>Section</th>}
                    <th style={thStyle}>Semester</th>
                    <th style={thStyle}>Amount</th>
                    {activeTab === 'pending' && <><th style={thStyle}>Submitted</th><th style={thStyle}>Actions</th></>}
                    {activeTab === 'approved' && <><th style={thStyle}>Approved On</th><th style={thStyle}>Approved By</th></>}
                    {activeTab === 'rejected' && <><th style={thStyle}>Rejected On</th><th style={thStyle}>Reason</th></>}
                  </tr>
                </thead>
                <tbody>
                  {paged.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      {activeTab === 'pending' && (
                        <td style={tdStyle}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(req.id)}
                            onChange={() => toggleSelect(req.id)}
                            style={{ cursor: 'pointer', accentColor: 'var(--color-gold)' }}
                          />
                        </td>
                      )}
                      <td style={tdStyle}>{req.roll_number}</td>
                      <td style={tdStyle}>{req.students?.full_name}</td>
                      <td style={tdStyle}>{req.students?.branches?.name}</td>
                      <td style={tdStyle}>{req.students?.specialisations?.name}</td>
                      {activeSection === 'all' && <td style={tdStyle}>{req.students?.sections?.name}</td>}
                      <td style={tdStyle}>{req.semesters?.name}</td>
                      <td style={tdStyle}>{formatCurrency(req.fee_amount)}</td>
                      {activeTab === 'pending' && (
                        <>
                          <td style={tdStyle}>{formatDate(req.submitted_at)}</td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className={`btn-success${actionLoading === req.id ? ' btn-breathing' : ''}`}
                                onClick={() => handleApprove(req)}
                                disabled={actionLoading === req.id}
                                style={{ padding: '4px 12px', fontSize: 'var(--text-xs)', minHeight: 32 }}
                              >
                                {actionLoading === req.id ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                className={`btn-danger${actionLoading === req.id ? ' btn-breathing' : ''}`}
                                onClick={() => setRejectModal({ open: true, request: req })}
                                disabled={actionLoading === req.id}
                                style={{ padding: '4px 12px', fontSize: 'var(--text-xs)', minHeight: 32 }}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                      {activeTab === 'approved' && (
                        <>
                          <td style={tdStyle}>{formatDate(req.reviewed_at)}</td>
                          <td style={tdStyle}>{req.reviewer?.full_name}</td>
                        </>
                      )}
                      {activeTab === 'rejected' && (
                        <>
                          <td style={tdStyle}>{formatDate(req.reviewed_at)}</td>
                          <td style={tdStyle} title={req.rejection_reason}>
                            {req.rejection_reason?.substring(0, 40)}{req.rejection_reason?.length > 40 ? '...' : ''}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={(activeSection === 'all' ? 9 : 8) + (activeTab === 'pending' ? 1 : 0)} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                        {activeTab === 'pending' ? 'No pending requests yet. Requests will appear here when students submit fee forms.'
                         : activeTab === 'approved' ? 'No approved requests yet.'
                         : 'No rejected requests yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, activeList.length)} of {activeList.length}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                Previous
              </Button>
              <Button variant="ghost" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Next
              </Button>
            </div>
          </div>
        )}

      </main>

      <RejectModal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, request: null })}
        studentName={rejectModal.request?.students?.full_name}
        rollNumber={rejectModal.request?.roll_number}
        onConfirm={handleReject}
        loading={actionLoading === rejectModal.request?.id}
      />
    </div>
  )
}

const MobileRequestCard = memo(function MobileRequestCard({ request, activeTab, showSection, onApprove, onReject, loading, selected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className="glass-card"
      style={{ padding: 16, cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeTab === 'pending' && (
            <input
              type="checkbox"
              checked={selected}
              onChange={e => { e.stopPropagation(); onToggleSelect() }}
              onClick={e => e.stopPropagation()}
              style={{ cursor: 'pointer', accentColor: 'var(--color-gold)' }}
            />
          )}
          <div>
            <p style={{ fontWeight: 500, color: 'var(--color-text)' }}>{request.students?.full_name}</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{request.roll_number}</p>
            {showSection && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gold)', marginTop: 2 }}>
                {request.students?.sections?.name}
              </p>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Badge status={request.status} />
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginTop: 4 }}>{formatCurrency(request.fee_amount)}</p>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border-light)' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Branch: {request.students?.branches?.name} | Spec: {request.students?.specialisations?.name}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Semester: {request.semesters?.name} | Submitted: {formatDate(request.submitted_at)}
          </p>
          {activeTab === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
              <button className={`btn-success${loading ? ' btn-breathing' : ''}`} onClick={onApprove} disabled={loading} style={{ flex: 1, fontSize: 'var(--text-xs)' }}>
                {loading ? 'Approving...' : 'Approve'}
              </button>
              <button className={`btn-danger${loading ? ' btn-breathing' : ''}`} onClick={onReject} disabled={loading} style={{ flex: 1, fontSize: 'var(--text-xs)' }}>
                Reject
              </button>
            </div>
          )}
          {activeTab === 'rejected' && request.rejection_reason && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginTop: 8 }}>
              Reason: {request.rejection_reason}
            </p>
          )}
        </div>
      )}
    </div>
  )
})

const MobileStudentCard = memo(function MobileStudentCard({ student, showSection }) {
  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontWeight: 500, color: 'var(--color-text)' }}>{student.full_name}</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{student.roll_number}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{student.branches?.name}</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{student.specialisations?.name}</p>
          {showSection && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gold)', marginTop: 2 }}>{student.sections?.name}</p>
          )}
        </div>
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Fee Amount</span>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gold)' }}>{student.fee_amount != null ? formatCurrency(student.fee_amount) : '—'}</span>
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Status</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 10px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 500,
          background: student.isPaid ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
          color: student.isPaid ? 'var(--color-success)' : 'var(--color-danger)',
        }}>
          {student.isPaid ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {student.isPaid ? 'Paid' : 'Unpaid'}
        </span>
      </div>
    </div>
  )
})

const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  fontSize: 'var(--text-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const tdStyle = {
  padding: '10px 12px',
  color: 'var(--color-text)',
}
