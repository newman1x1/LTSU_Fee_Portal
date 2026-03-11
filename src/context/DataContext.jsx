import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [branches, setBranches] = useState([])
  const [specialisations, setSpecialisations] = useState([])
  const [sections, setSections] = useState([])
  const [batchConfigs, setBatchConfigs] = useState([])
  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [branchRes, specRes, secRes, batchRes, semRes] = await Promise.all([
        supabase.from('branches').select('*').order('name'),
        supabase.from('specialisations').select('*').order('name'),
        supabase.from('sections').select('*, semesters(id, name, number), branches(name), specialisations(name)').order('name'),
        supabase.from('batch_configs').select('*').order('batch_year', { ascending: false }),
        supabase.from('semesters').select('*').order('number'),
      ])

      // Check for individual query errors
      const errors = [branchRes, specRes, secRes, batchRes, semRes].filter(r => r.error)
      if (errors.length) {
        console.error('Data fetch errors:', errors.map(r => r.error))
      }

      setBranches(branchRes.data || [])
      setSpecialisations(specRes.data || [])
      setSections(secRes.data || [])
      setBatchConfigs(batchRes.data || [])
      setSemesters(semRes.data || [])
    } catch (err) {
      console.error('Error fetching reference data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refetchBranches = useCallback(async () => {
    const { data, error } = await supabase.from('branches').select('*').order('name')
    if (error) console.error('Refetch branches error:', error)
    setBranches(data || [])
  }, [])

  const refetchSpecialisations = useCallback(async () => {
    const { data, error } = await supabase.from('specialisations').select('*').order('name')
    if (error) console.error('Refetch specs error:', error)
    setSpecialisations(data || [])
  }, [])

  const refetchSections = useCallback(async () => {
    const { data, error } = await supabase.from('sections').select('*, semesters(id, name, number), branches(name), specialisations(name)').order('name')
    if (error) console.error('Refetch sections error:', error)
    setSections(data || [])
  }, [])

  const refetchBatches = useCallback(async () => {
    const { data, error } = await supabase.from('batch_configs').select('*').order('batch_year', { ascending: false })
    if (error) console.error('Refetch batches error:', error)
    setBatchConfigs(data || [])
  }, [])

  const refetchSemesters = useCallback(async () => {
    const { data, error } = await supabase.from('semesters').select('*').order('number')
    if (error) console.error('Refetch semesters error:', error)
    setSemesters(data || [])
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const activeBranches = useMemo(() => branches.filter(b => b.is_active), [branches])
  const activeSpecs = useMemo(() => specialisations.filter(s => s.is_active), [specialisations])
  const activeSections = useMemo(() => sections.filter(s => s.is_active), [sections])
  const activeBatches = useMemo(() => batchConfigs.filter(b => b.is_active), [batchConfigs])
  const activeSemesters = useMemo(() => semesters.filter(s => s.is_active), [semesters])

  const getSpecsByBranch = useCallback((branchId) => activeSpecs.filter(s => s.branch_id === branchId), [activeSpecs])
  const getSectionsByBranchAndSpec = useCallback((branchId, specId) =>
    activeSections.filter(s => s.branch_id === branchId && s.specialisation_id === specId), [activeSections])

  const value = useMemo(() => ({
    branches, specialisations, sections, batchConfigs, semesters,
    activeBranches, activeSpecs, activeSections, activeBatches, activeSemesters,
    getSpecsByBranch, getSectionsByBranchAndSpec,
    refetch: fetchAll, loading,
    refetchBranches, refetchSpecialisations, refetchSections, refetchBatches, refetchSemesters,
  }), [
    branches, specialisations, sections, batchConfigs, semesters,
    activeBranches, activeSpecs, activeSections, activeBatches, activeSemesters,
    getSpecsByBranch, getSectionsByBranchAndSpec, fetchAll, loading,
    refetchBranches, refetchSpecialisations, refetchSections, refetchBatches, refetchSemesters,
  ])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within a DataProvider')
  return context
}
