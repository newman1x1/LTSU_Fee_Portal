import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useActivityLog(filters = {}) {
  const [logs, setLogs] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const pageSize = 20

  useEffect(() => { setPage(0) }, [
    filters.dateFrom, filters.dateTo, filters.role,
    filters.actionType, filters.branch, filters.section, filters.search,
    filters.sortBy,
  ])

  const buildQuery = useCallback((base) => {
    let q = base
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom)
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59')
    if (filters.role && filters.role !== 'all') q = q.eq('performed_by_role', filters.role)
    if (filters.actionType && filters.actionType !== 'all') q = q.eq('action_type', filters.actionType)
    if (filters.branch && filters.branch !== 'all') q = q.eq('branch_name', filters.branch)
    if (filters.section && filters.section !== 'all') q = q.eq('section_name', filters.section)
    if (filters.search) {
      const safe = filters.search.replace(/[^a-zA-Z0-9\s\-_]/g, '')
      if (safe) {
        q = q.or(`performed_by_name.ilike.%${safe}%,target_name.ilike.%${safe}%,target_roll.ilike.%${safe}%`)
      }
    }
    return q
  }, [filters.dateFrom, filters.dateTo, filters.role, filters.actionType, filters.branch, filters.section, filters.search])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const ascending = filters.sortBy === 'oldest'
      const sortCol = 'created_at'

      const { data, count } = await buildQuery(
        supabase.from('activity_logs').select('*', { count: 'exact' })
      )
        .order(sortCol, { ascending })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      setTotalCount(count || 0)
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching activity logs:', err)
    } finally {
      setLoading(false)
    }
  }, [buildQuery, filters.sortBy, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return { logs, loading, totalCount, page, setPage, pageSize, refetch: fetchLogs }
}
