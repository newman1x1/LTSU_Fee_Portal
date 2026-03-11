import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { logAction } from '../../utils/logAction'
import { sanitizeText, sanitizeRollNumber } from '../../utils/validators'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

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

export default function StudentManager() {
  const { addToast } = useToast()
  const { activeBranches: branches, activeSpecs: specs, activeSections: sections, activeBatches: batches } = useData()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const [filterBranch, setFilterBranch] = useState('')
  const [filterSpec, setFilterSpec] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterBatch, setFilterBatch] = useState('')
  const [search, setSearch] = useState('')

  const [page, setPage] = useState(0)
  const pageSize = 20

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    roll_number: '',
    full_name: '',
    branch_id: '',
    specialisation_id: '',
    section_id: '',
    batch_year: '',
  })
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    setPage(0)
  }, [filterBranch, filterSpec, filterSection, filterBatch, search])

  const fetchStudents = async () => {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('*, branches(name), specialisations(name), sections(name)')
        .order('uploaded_at', { ascending: false })

      setStudents(studentData || [])
    } catch (err) {
      addToast('Failed to load students', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = students.filter(s => {
    if (filterBranch && s.branch_id !== filterBranch) return false
    if (filterSpec && s.specialisation_id !== filterSpec) return false
    if (filterSection && s.section_id !== filterSection) return false
    if (filterBatch && s.batch_year !== Number(filterBatch)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!s.full_name.toLowerCase().includes(q) && !s.roll_number.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedStudents = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const branchOptions = branches.map(b => ({ value: b.id, label: b.name }))

  const filterSpecOptions = filterBranch
    ? specs.filter(s => s.branch_id === filterBranch)
    : specs

  const filterSectionOptions = filterSpec
    ? sections.filter(s => s.specialisation_id === filterSpec)
    : sections

  const modalSpecOptions = form.branch_id
    ? specs.filter(s => s.branch_id === form.branch_id).map(s => ({ value: s.id, label: s.name }))
    : []

  const modalSectionOptions = form.specialisation_id
    ? sections.filter(s => s.specialisation_id === form.specialisation_id).map(s => ({ value: s.id, label: s.name }))
    : []

  const batchOptions = batches.map(b => ({ value: String(b.batch_year), label: String(b.batch_year) }))

  const openCreate = () => {
    setEditing(null)
    setForm({ roll_number: '', full_name: '', branch_id: '', specialisation_id: '', section_id: '', batch_year: '' })
    setModalOpen(true)
  }

  const openEdit = (student) => {
    setEditing(student)
    setForm({
      roll_number: student.roll_number,
      full_name: student.full_name,
      branch_id: student.branch_id,
      specialisation_id: student.specialisation_id,
      section_id: student.section_id,
      batch_year: String(student.batch_year),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const rollNumber = sanitizeRollNumber(form.roll_number)
    const fullName = sanitizeText(form.full_name)

    if (!rollNumber || !fullName || !form.branch_id || !form.specialisation_id || !form.section_id || !form.batch_year) {
      addToast('All fields are required', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        roll_number: rollNumber,
        full_name: fullName,
        branch_id: form.branch_id,
        specialisation_id: form.specialisation_id,
        section_id: form.section_id,
        batch_year: Number(form.batch_year),
      }

      if (editing) {
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', editing.id)

        if (error) throw error

        await logAction({
          actionType: 'admin_updated_student',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { action: 'updated', student: fullName, roll_number: rollNumber },
        })
        addToast('Student updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('students')
          .insert({ ...payload, is_active: true })

        if (error) throw error

        await logAction({
          actionType: 'admin_created_student',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { student: fullName, roll_number: rollNumber },
        })
        addToast('Student added successfully', 'success')
      }

      setModalOpen(false)
      fetchStudents()
    } catch (err) {
      addToast(err.message || 'Failed to save student', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (student) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: !student.is_active })
        .eq('id', student.id)

      if (error) throw error

      await logAction({
        actionType: 'admin_updated_student',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { action: student.is_active ? 'deactivated' : 'activated', student: student.full_name, roll_number: student.roll_number },
      })
      addToast(`${student.full_name} ${student.is_active ? 'deactivated' : 'activated'}`, 'success')
      fetchStudents()
    } catch (err) {
      addToast(err.message || 'Failed to update student', 'error')
    }
  }

  const handleDelete = async (student) => {
    if (!window.confirm(`⚠️ WARNING: Permanently delete student "${student.full_name}" (${student.roll_number})?\n\nThis will ALSO DELETE all their fee request history (approved, pending, rejected). This data CANNOT be recovered.\n\nConsider deactivating instead if you want to preserve records.`)) return
    try {
      const { error } = await supabase.from('students').delete().eq('id', student.id)
      if (error) throw error
      await logAction({
        actionType: 'admin_deleted_student',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { student: student.full_name, roll_number: student.roll_number },
      })
      addToast('Student deleted', 'success')
      fetchStudents()
    } catch (err) {
      addToast(err.message || 'Failed to delete. Student may have fee requests.', 'error')
    }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-text)' }}>
            Student Records
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={openCreate}>Add Student</Button>
      </div>

      <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 12,
        }}>
          <Select
            label="Branch"
            value={filterBranch}
            onChange={e => { setFilterBranch(e.target.value); setFilterSpec(''); setFilterSection('') }}
            options={branchOptions}
            placeholder="All Branches"
          />
          <Select
            label="Specialisation"
            value={filterSpec}
            onChange={e => { setFilterSpec(e.target.value); setFilterSection('') }}
            options={filterSpecOptions.map(s => ({ value: s.id, label: s.name }))}
            placeholder={filterBranch ? 'All Specialisations' : 'Select a branch first'}
          />
          <Select
            label="Section"
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
            options={filterSectionOptions.map(s => ({ value: s.id, label: s.name }))}
            placeholder={filterSpec ? 'All Sections' : 'Select a specialisation first'}
          />
          <Select
            label="Batch Year"
            value={filterBatch}
            onChange={e => setFilterBatch(e.target.value)}
            options={batchOptions}
            placeholder="All Batches"
          />
          <div style={{ gridColumn: isMobile ? '1' : '2 / 4' }}>
            <div style={{ position: 'relative' }}>
              <Input
                label="Search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or roll number..."
                style={{ paddingLeft: 36 }}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  bottom: 14,
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {paginatedStudents.map(student => (
            <div key={student.id} className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-navy)', letterSpacing: '0.02em' }}>
                  {student.roll_number}
                </span>
                <span className={`badge ${student.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                  {student.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                {student.full_name}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                {student.branches?.name} · {student.sections?.name} · {student.batch_year}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => openEdit(student)} style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}>
                  Edit
                </Button>
                <Button
                  variant={student.is_active ? 'danger' : 'success'}
                  onClick={() => toggleActive(student)}
                  style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                >
                  {student.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(student)}
                  style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {paginatedStudents.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
              No students found
            </div>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <th style={thStyle}>Roll Number</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Branch</th>
                <th style={thStyle}>Section</th>
                <th style={thStyle}>Batch Year</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map(student => (
                <tr
                  key={student.id}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    background: hoveredRow === student.id ? 'rgba(201,168,76,0.04)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={() => setHoveredRow(student.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={tdStyle}>{student.roll_number}</td>
                  <td style={tdStyle}>{student.full_name}</td>
                  <td style={tdStyle}>{student.branches?.name}</td>
                  <td style={tdStyle}>{student.sections?.name}</td>
                  <td style={tdStyle}>{student.batch_year}</td>
                  <td style={tdStyle}>
                    <span className={`badge ${student.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="ghost" onClick={() => openEdit(student)} style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}>
                        Edit
                      </Button>
                      <Button
                        variant={student.is_active ? 'danger' : 'success'}
                        onClick={() => toggleActive(student)}
                        style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                      >
                        {student.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(student)}
                        style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                    No students found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24, flexWrap: 'wrap' }}>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Student' : 'Add Student'}>
        <Input
          label="Roll Number"
          value={form.roll_number}
          onChange={e => setForm(f => ({ ...f, roll_number: e.target.value }))}
          placeholder="e.g. 22BCE001"
        />
        <Input
          label="Full Name"
          value={form.full_name}
          onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
          placeholder="e.g. John Doe"
        />
        <Select
          label="Branch"
          value={form.branch_id}
          onChange={e => setForm(f => ({ ...f, branch_id: e.target.value, specialisation_id: '', section_id: '' }))}
          options={branchOptions}
          placeholder="Select Branch"
        />
        <Select
          label="Specialisation"
          value={form.specialisation_id}
          onChange={e => setForm(f => ({ ...f, specialisation_id: e.target.value, section_id: '' }))}
          options={modalSpecOptions}
          placeholder={form.branch_id ? 'Select Specialisation' : 'Select a branch first'}
        />
        <Select
          label="Section"
          value={form.section_id}
          onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
          options={modalSectionOptions}
          placeholder={form.specialisation_id ? 'Select Section' : 'Select a specialisation first'}
        />
        <Select
          label="Batch Year"
          value={form.batch_year}
          onChange={e => setForm(f => ({ ...f, batch_year: e.target.value }))}
          options={batchOptions}
          placeholder="Select Batch Year"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </Modal>
    </div>
  )
}
