import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useData } from '../../context/DataContext'
import { formatDateTime, formatActionType } from '../../utils/formatters'
import StatsCard from '../ui/StatsCard'
import Spinner from '../ui/Spinner'
import Button from '../ui/Button'
import {
  GitBranch,
  Grid3X3,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  GraduationCap,
} from 'lucide-react'

export default function AdminOverview({ onNavigate }) {
  const { branches, sections } = useData()
  const [stats, setStats] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [
        { count: studentCount },
        { count: staffCount },
        { count: approvedCount },
        { count: pendingCount },
        { count: rejectedCount },
        { data: logs },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('fee_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('fee_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('fee_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('activity_logs').select('id, action_type, performed_by_name, created_at').order('created_at', { ascending: false }).limit(10),
      ])

      setStats({
        branches: branches.length,
        sections: sections.length,
        students: studentCount || 0,
        staff: staffCount || 0,
        totalRequests: (approvedCount || 0) + (pendingCount || 0) + (rejectedCount || 0),
        approved: approvedCount || 0,
        pending: pendingCount || 0,
        rejected: rejectedCount || 0,
      })
      setRecentLogs(logs || [])
    } catch (err) {
      console.error('Failed to load overview:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner />

  const quickLinks = [
    { id: 'branches', label: 'Manage Branches' },
    { id: 'specialisations', label: 'Manage Specialisations' },
    { id: 'sections', label: 'Manage Sections' },
    { id: 'batches', label: 'Manage Batches' },
    { id: 'semesters', label: 'Manage Semesters' },
    { id: 'staff', label: 'Manage Staff' },
    { id: 'upload', label: 'Upload Students' },
  ]

  return (
    <div>
      <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 24 }}>
        Overview
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        <StatsCard icon={GitBranch} label="Branches" value={stats?.branches} borderColor="var(--color-navy)" />
        <StatsCard icon={Grid3X3} label="Sections" value={stats?.sections} borderColor="var(--color-gold)" />
        <StatsCard icon={GraduationCap} label="Students" value={stats?.students} borderColor="var(--color-pending)" />
        <StatsCard icon={Users} label="Staff Accounts" value={stats?.staff} borderColor="#7C3AED" />
        <StatsCard icon={FileText} label="Total Requests" value={stats?.totalRequests} borderColor="var(--color-navy)" />
        <StatsCard icon={CheckCircle} label="Approved" value={stats?.approved} borderColor="var(--color-success)" />
        <StatsCard icon={Clock} label="Pending" value={stats?.pending} borderColor="var(--color-warning)" />
        <StatsCard icon={XCircle} label="Rejected" value={stats?.rejected} borderColor="var(--color-error)" />
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
        <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>
          Recent Activity
        </h3>
        {recentLogs.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No recent activity</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentLogs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--color-border-light)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                    {formatActionType(log.action_type)}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>
                    by {log.performed_by_name}
                  </span>
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                  {formatDateTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>
          Quick Links
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {quickLinks.map(link => (
            <Button key={link.id} variant="secondary" onClick={() => onNavigate(link.id)}>
              {link.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
