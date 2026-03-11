import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useActivityLog } from '../hooks/useActivityLog'
import { formatDateTime, formatActionType } from '../utils/formatters'
import Navbar from '../components/layout/Navbar'
import PageWrapper from '../components/layout/PageWrapper'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Spinner from '../components/ui/Spinner'
import { Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Home, X } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'cr', label: 'CR' },
  { value: 'student', label: 'Student' },
  { value: 'system', label: 'System' },
]

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'request_submitted', label: 'Request Submitted' },
  { value: 'request_approved', label: 'Request Approved' },
  { value: 'request_rejected', label: 'Request Rejected' },
  { value: 'receipt_sent', label: 'Receipt Sent' },
  { value: 'rejection_email_sent', label: 'Rejection Email Sent' },
  { value: 'staff_login', label: 'Staff Login' },
  { value: 'admin_login', label: 'Admin Login' },
  { value: 'student_uploaded', label: 'Student Uploaded' },
  { value: 'account_created', label: 'Account Created' },
  { value: 'account_deactivated', label: 'Account Deactivated' },
  { value: 'admin_reset_password', label: 'Admin Reset Password' },
  { value: 'branch_created', label: 'Branch Created' },
  { value: 'section_created', label: 'Section Created' },
  { value: 'semester_created', label: 'Semester Created' },
  { value: 'batch_created', label: 'Batch Created' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
]

const defaultFilters = {
  dateFrom: '',
  dateTo: '',
  role: 'all',
  actionType: 'all',
  branch: 'all',
  section: 'all',
  search: '',
  sortBy: 'newest',
}

export default function ActivityLogPage() {
  const navigate = useNavigate()
  const { activeBranches, activeSections } = useData()
  const [filters, setFilters] = useState(defaultFilters)
  const [applied, setApplied] = useState(defaultFilters)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [expandedRow, setExpandedRow] = useState(null)

  useEffect(() => {
    const handle = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setFiltersOpen(false)
    }
    handle()
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const { logs, loading, totalCount, page, setPage, pageSize } = useActivityLog(applied)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const handleChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const applyFilters = () => {
    setApplied({ ...filters })
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
    setApplied(defaultFilters)
  }

  const branchOptions = [
    { value: 'all', label: 'All Branches' },
    ...activeBranches.map(b => ({ value: b.name, label: b.name })),
  ]

  const sectionOptions = [
    { value: 'all', label: 'All Sections' },
    ...activeSections.map(s => ({ value: s.name, label: s.name })),
  ]

  /* Strip PII (emails, passwords, phones) from log details before display */
  const sanitizeDetails = (details) => {
    if (!details || typeof details !== 'object') return details
    const piiKeys = ['email', 'password', 'phone', 'phone_number', 'mobile']
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const cleaned = {}
    for (const [key, value] of Object.entries(details)) {
      if (piiKeys.includes(key.toLowerCase())) continue
      if (typeof value === 'string' && emailRegex.test(value.trim())) continue
      cleaned[key] = value
    }
    return Object.keys(cleaned).length > 0 ? cleaned : null
  }

  const roleBadge = (role) => {
    if (!role) return null
    const colors = {
      admin: { bg: 'rgba(201,168,76,0.15)', text: 'var(--color-gold)' },
      teacher: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
      cr: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
      student: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
      system: { bg: 'rgba(148,163,184,0.15)', text: 'var(--color-text-muted)' },
    }
    const c = colors[role] || colors.system
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        background: c.bg,
        color: c.text,
        marginLeft: 6,
        textTransform: 'capitalize',
      }}>
        {role}
      </span>
    )
  }

  const renderDetails = (rawDetails, logId) => {
    const details = sanitizeDetails(rawDetails)
    if (!details) return <span style={{ color: 'var(--color-text-muted)' }}>-</span>
    const isExpanded = expandedRow === logId
    const text = JSON.stringify(details, null, 2)
    const short = text.length > 60 ? text.slice(0, 60) + '…' : text
    return (
      <div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
          {isExpanded ? text : short}
        </span>
        {text.length > 60 && (
          <button
            onClick={() => setExpandedRow(isExpanded ? null : logId)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-gold)', fontSize: 'var(--text-xs)',
              marginLeft: 4, padding: 0,
            }}
          >
            {isExpanded ? 'collapse' : 'expand'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <PageWrapper maxWidth={1400}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexWrap: 'wrap', gap: 16, marginBottom: 32,
        }}>
          <div>
            <h1 className="font-display" style={{
              fontSize: 'var(--text-3xl)', fontWeight: 600,
              color: 'var(--color-navy)', marginBottom: 6,
            }}>
              Activity Log
            </h1>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)' }}>
              Complete record of all actions performed on this portal.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Home size={16} /> Back to Home
          </Button>
        </div>

        <GlassCard hover={false} style={{ marginBottom: 24, padding: 24 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: isMobile ? 'pointer' : 'default',
            marginBottom: filtersOpen ? 20 : 0,
          }}
            onClick={() => isMobile && setFiltersOpen(p => !p)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
              <Filter size={16} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Filters</span>
            </div>
            {isMobile && (filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
          </div>

          {filtersOpen && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
                gap: 16,
              }}>
                <Input
                  label="Date From"
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => handleChange('dateFrom', e.target.value)}
                />
                <Input
                  label="Date To"
                  type="date"
                  value={filters.dateTo}
                  onChange={e => handleChange('dateTo', e.target.value)}
                />
                <Select
                  label="Role"
                  options={ROLE_OPTIONS}
                  value={filters.role}
                  onChange={e => handleChange('role', e.target.value)}
                  placeholder="All Roles"
                />
                <Select
                  label="Action Type"
                  options={ACTION_OPTIONS}
                  value={filters.actionType}
                  onChange={e => handleChange('actionType', e.target.value)}
                  placeholder="All Actions"
                />
                <Select
                  label="Branch"
                  options={branchOptions}
                  value={filters.branch}
                  onChange={e => handleChange('branch', e.target.value)}
                  placeholder="All Branches"
                />
                <Select
                  label="Section"
                  options={sectionOptions}
                  value={filters.section}
                  onChange={e => handleChange('section', e.target.value)}
                  placeholder="All Sections"
                />
                <Select
                  label="Sort"
                  options={SORT_OPTIONS}
                  value={filters.sortBy}
                  onChange={e => handleChange('sortBy', e.target.value)}
                  placeholder="Newest First"
                />
                <Input
                  label="Search"
                  placeholder="Name, roll number..."
                  value={filters.search}
                  onChange={e => handleChange('search', e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 20 }}>
                <Button onClick={applyFilters}>Apply Filters</Button>
                <button
                  onClick={clearFilters}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
                    textDecoration: 'underline',
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </>
          )}
        </GlassCard>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, flexWrap: 'wrap', gap: 8,
        }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Showing <strong style={{ color: 'var(--color-navy)' }}>{logs.length}</strong> of{' '}
            <strong style={{ color: 'var(--color-navy)' }}>{totalCount}</strong> entries
          </p>
        </div>

        {loading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <GlassCard hover={false}>
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 40 }}>
              No activity logs found matching your filters.
            </p>
          </GlassCard>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {logs.map((log, i) => (
              <GlassCard key={log.id || i} hover={false}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {formatDateTime(log.created_at)}
                  </span>
                  {roleBadge(log.performed_by_role)}
                </div>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
                  {formatActionType(log.action_type)}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                  By: {log.performed_by_name || '-'}
                </p>
                {log.target_name && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                    Target: {log.target_name}{log.target_roll ? ` (${log.target_roll})` : ''}
                  </p>
                )}
                {log.section_name && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                    Section: {log.section_name}
                  </p>
                )}
                {log.details && (
                  <div style={{ marginTop: 6 }}>{renderDetails(log.details, log.id)}</div>
                )}
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard hover={false} style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Timestamp', 'Action', 'Performed By', 'Student / Target', 'Section', 'Details'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '12px 16px',
                        fontSize: 'var(--text-xs)', fontWeight: 600,
                        color: 'var(--color-text-muted)', textTransform: 'uppercase',
                        letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id || i} style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.created_at)}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 'var(--text-sm)', color: 'var(--color-text)', fontWeight: 500 }}>
                        {formatActionType(log.action_type)}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                        <span>{log.performed_by_name || '-'}</span>
                        {roleBadge(log.performed_by_role)}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                        {log.target_name
                          ? <>{log.target_name}{log.target_roll ? <span style={{ color: 'var(--color-text-muted)', marginLeft: 4 }}>({log.target_roll})</span> : ''}</>
                          : <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                        }
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                        {log.section_name || <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                      </td>
                      <td style={{ padding: '10px 16px', maxWidth: 300 }}>
                        {renderDetails(log.details, log.id)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {totalPages > 1 && (() => {
          const maxVisible = isMobile ? 3 : 5
          let startPage = Math.max(0, page - Math.floor(maxVisible / 2))
          let endPage = startPage + maxVisible - 1
          if (endPage >= totalPages) {
            endPage = totalPages - 1
            startPage = Math.max(0, endPage - maxVisible + 1)
          }
          const pageNumbers = []
          for (let i = startPage; i <= endPage; i++) pageNumbers.push(i)

          return (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: 6, marginTop: 24, flexWrap: 'wrap',
            }}>
              <Button
                variant="ghost"
                disabled={page === 0}
                onClick={() => setPage(0)}
                style={{ padding: '6px 10px', fontSize: 'var(--text-xs)' }}
              >
                First
              </Button>
              <Button
                variant="ghost"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                style={{ padding: '6px 8px' }}
              >
                <ChevronLeft size={16} />
              </Button>

              {startPage > 0 && (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', padding: '0 2px' }}>…</span>
              )}

              {pageNumbers.map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    minWidth: 34,
                    height: 34,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 'var(--text-sm)',
                    fontWeight: n === page ? 600 : 400,
                    background: n === page ? 'var(--color-navy)' : 'transparent',
                    color: n === page ? 'var(--color-gold)' : 'var(--color-text)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {n + 1}
                </button>
              ))}

              {endPage < totalPages - 1 && (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', padding: '0 2px' }}>…</span>
              )}

              <Button
                variant="ghost"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                style={{ padding: '6px 8px' }}
              >
                <ChevronRight size={16} />
              </Button>
              <Button
                variant="ghost"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(totalPages - 1)}
                style={{ padding: '6px 10px', fontSize: 'var(--text-xs)' }}
              >
                Last
              </Button>
            </div>
          )
        })()}
      </PageWrapper>
    </div>
  )
}
