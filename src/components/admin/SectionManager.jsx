import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { logAction } from '../../utils/logAction'
import { formatDate } from '../../utils/formatters'
import { sanitizeText } from '../../utils/validators'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Modal from '../ui/Modal'

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

export default function SectionManager() {
  const { addToast } = useToast()
  const { sections, activeBranches, activeSpecs, activeSemesters, refetchSections, loading } = useData()
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterBranch, setFilterBranch] = useState('')
  const [filterSpec, setFilterSpec] = useState('')
  const [form, setForm] = useState({ name: '', branch_id: '', specialisation_id: '', semester_id: '' })

  const sortedSections = useMemo(() =>
    [...sections].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [sections]
  )

  const filteredSpecs = filterBranch
    ? activeSpecs.filter(s => s.branch_id === filterBranch)
    : activeSpecs

  const filtered = sortedSections.filter(s => {
    if (filterBranch && s.branch_id !== filterBranch) return false
    if (filterSpec && s.specialisation_id !== filterSpec) return false
    return true
  })

  const branchOptions = activeBranches.map(b => ({ value: b.id, label: b.name }))

  const modalSpecOptions = form.branch_id
    ? activeSpecs.filter(s => s.branch_id === form.branch_id).map(s => ({ value: s.id, label: s.name }))
    : []

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', branch_id: '', specialisation_id: '', semester_id: '' })
    setModalOpen(true)
  }

  const openEdit = (section) => {
    setEditing(section)
    setForm({ name: section.name, branch_id: section.branch_id, specialisation_id: section.specialisation_id, semester_id: section.semester_id })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const name = sanitizeText(form.name)

    if (!name || !form.branch_id || !form.specialisation_id || !form.semester_id) {
      addToast('All fields are required', 'error')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from('sections')
          .update({ name, branch_id: form.branch_id, specialisation_id: form.specialisation_id, semester_id: form.semester_id })
          .eq('id', editing.id)

        if (error) throw error

        await logAction({
          actionType: 'admin_updated_section',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { action: 'updated', section: name },
        })
        addToast('Section updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('sections')
          .insert({ name, branch_id: form.branch_id, specialisation_id: form.specialisation_id, semester_id: form.semester_id, is_active: true })

        if (error) throw error

        await logAction({
          actionType: 'admin_created_section',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { section: name },
        })
        addToast('Section created successfully', 'success')
      }

      setModalOpen(false)
      refetchSections()
    } catch (err) {
      addToast(err.message || 'Failed to save section', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (section) => {
    try {
      const { error } = await supabase
        .from('sections')
        .update({ is_active: !section.is_active })
        .eq('id', section.id)

      if (error) throw error

      await logAction({
        actionType: 'admin_toggled_section',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { action: section.is_active ? 'deactivated' : 'activated', section: section.name },
      })
      addToast(`Section ${section.is_active ? 'deactivated' : 'activated'}`, 'success')
      refetchSections()
    } catch (err) {
      addToast(err.message || 'Failed to update', 'error')
    }
  }

  const handleDelete = async (section) => {
    if (!window.confirm(`Permanently delete section "${section.name}"?\n\nThis will fail if any students or staff are still assigned to this section. Consider deactivating instead to preserve historical data.`)) return
    try {
      const { error } = await supabase.from('sections').delete().eq('id', section.id)
      if (error) throw error
      await logAction({
        actionType: 'admin_deleted_section',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { section: section.name },
      })
      addToast('Section deleted', 'success')
      refetchSections()
    } catch (err) {
      addToast(err.message || 'Failed to delete. It may have dependent records.', 'error')
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-text)' }}>
          Sections
        </h2>
        <Button onClick={openCreate}>Add Section</Button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 200 }}>
          <Select
            label="Filter by Branch"
            value={filterBranch}
            onChange={e => { setFilterBranch(e.target.value); setFilterSpec('') }}
            options={branchOptions}
            placeholder="All Branches"
          />
        </div>
        <div style={{ minWidth: 200 }}>
          <Select
            label="Filter by Specialisation"
            value={filterSpec}
            onChange={e => setFilterSpec(e.target.value)}
            options={filteredSpecs.map(s => ({ value: s.id, label: s.name }))}
            placeholder="All Specialisations"
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <th style={thStyle}>Branch</th>
              <th style={thStyle}>Specialisation</th>
              <th style={thStyle}>Section</th>
              <th style={thStyle}>Semester</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created At</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(section => (
              <tr key={section.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <td style={tdStyle}>{section.branches?.name}</td>
                <td style={tdStyle}>{section.specialisations?.name}</td>
                <td style={tdStyle}>{section.name}</td>
                <td style={tdStyle}>{section.semesters?.name || '—'}</td>
                <td style={tdStyle}>
                  <span className={`badge ${section.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                    {section.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle}>{formatDate(section.created_at)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" onClick={() => openEdit(section)} style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}>
                      Edit
                    </Button>
                    <Button
                      variant={section.is_active ? 'danger' : 'success'}
                      onClick={() => toggleActive(section)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      {section.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(section)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  No sections found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Section' : 'Add Section'}>
        <Select
          label="Branch"
          value={form.branch_id}
          onChange={e => setForm(f => ({ ...f, branch_id: e.target.value, specialisation_id: '' }))}
          options={branchOptions}
          placeholder="Select Branch"
        />
        <Select
          label="Specialisation"
          value={form.specialisation_id}
          onChange={e => setForm(f => ({ ...f, specialisation_id: e.target.value }))}
          options={modalSpecOptions}
          placeholder={form.branch_id ? 'Select Specialisation' : 'Select a branch first'}
        />
        <Select
          label="Semester"
          value={form.semester_id}
          onChange={e => setForm(f => ({ ...f, semester_id: e.target.value }))}
          options={activeSemesters.map(s => ({ value: s.id, label: s.name }))}
          placeholder="Select Semester"
        />
        <Input
          label="Section Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Section A"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </Modal>
    </div>
  )
}
