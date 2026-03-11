import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useData } from '../context/DataContext'

export function useFeeRequests(sectionIds = []) {
  const { batchConfigs } = useData()
  const [requests, setRequests] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRequests = useCallback(async (signal) => {
    if (!sectionIds.length) {
      setRequests([])
      setStudents([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Fetch full student list with details for the Students tab
      const { data: studentList } = await supabase
        .from('students')
        .select('id, roll_number, full_name, batch_year, section_id, branches(name), specialisations(name), sections(name)')
        .in('section_id', sectionIds)
        .order('roll_number', { ascending: true })

      // Build fee map from DataContext batchConfigs (no extra API call)
      const feeMap = {}
      ;(batchConfigs || []).forEach(c => { feeMap[c.batch_year] = c.fee_amount })

      // Attach fee_amount to each student
      const enrichedStudents = (studentList || []).map(s => ({
        ...s,
        fee_amount: s.batch_year ? (feeMap[s.batch_year] ?? null) : null
      }))

      if (signal?.aborted) return
      setStudents(enrichedStudents)

      if (!enrichedStudents.length) {
        setRequests([])
        setLoading(false)
        return
      }

      const studentIds = enrichedStudents.map(s => s.id)

      const { data } = await supabase
        .from('fee_requests')
        .select(`
          *,
          students(full_name, branch_id, specialisation_id, section_id,
            branches(name),
            specialisations(name),
            sections(name)
          ),
          semesters(name, number),
          reviewer:users!fee_requests_reviewed_by_fkey(full_name, role)
        `)
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false })

      if (signal?.aborted) return
      setRequests(data || [])
    } catch (err) {
      console.error('Error fetching fee requests:', err)
      if (!signal?.aborted) setError(err.message || 'Failed to load data')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [JSON.stringify(sectionIds), batchConfigs])

  useEffect(() => {
    const ac = new AbortController()
    fetchRequests(ac.signal)
    return () => ac.abort()
  }, [fetchRequests])

  return { requests, students, studentCount: students.length, loading, error, refetch: fetchRequests }
}
