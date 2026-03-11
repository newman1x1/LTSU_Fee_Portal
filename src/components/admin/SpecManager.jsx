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

export default function SpecManager() {
  const { addToast } = useToast()
  const { branches, activeBranches, specialisations, refetchSpecialisations, loading } = useData()
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterBranch, setFilterBranch] = useState('')
  const [form, setForm] = useState({ name: '', code: '', branch_id: '' })

  const sortedSpecs = useMemo(() =>
    [...specialisations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [specialisations]
  )

  const filtered = filterBranch
    ? sortedSpecs.filter(s => s.branch_id === filterBranch)
    : sortedSpecs

  const branchOptions = activeBranches.map(b => ({ value: b.id, label: b.name }))

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', code: '', branch_id: '' })
    setModalOpen(true)
  }

  const openEdit = (spec) => {
    setEditing(spec)
    setForm({ name: spec.name, code: spec.code || '', branch_id: spec.branch_id })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const name = sanitizeText(form.name)
    const code = sanitizeText(form.code)

    if (!name || !form.branch_id) {
      addToast('Name and Branch are required', 'error')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from('specialisations')
          .update({ name, code, branch_id: form.branch_id })
          .eq('id', editing.id)

        if (error) throw error

        await logAction({
          actionType: 'admin_updated_specialisation',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { action: 'updated', specialisation: name },
        })
        addToast('Specialisation updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('specialisations')
          .insert({ name, code, branch_id: form.branch_id, is_active: true })

        if (error) throw error

        await logAction({
          actionType: 'admin_created_specialisation',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { specialisation: name, code },
        })
        addToast('Specialisation created successfully', 'success')
      }

      setModalOpen(false)
      refetchSpecialisations()
    } catch (err) {
      addToast(err.message || 'Failed to save specialisation', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (spec) => {
    try {
      const { error } = await supabase
        .from('specialisations')
        .update({ is_active: !spec.is_active })
        .eq('id', spec.id)

      if (error) throw error

      await logAction({
        actionType: 'admin_toggled_specialisation',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { action: spec.is_active ? 'deactivated' : 'activated', specialisation: spec.name },
      })
      addToast(`Specialisation ${spec.is_active ? 'deactivated' : 'activated'}`, 'success')
      refetchSpecialisations()
    } catch (err) {
      addToast(err.message || 'Failed to update', 'error')
    }
  }

  const handleDelete = async (spec) => {
    if (!window.confirm(`Permanently delete specialisation "${spec.name}"?\n\nThis will fail if any sections or students still reference this specialisation. Consider deactivating instead to preserve historical data.`)) return
    try {
      const { error } = await supabase.from('specialisations').delete().eq('id', spec.id)
      if (error) throw error
      await logAction({
        actionType: 'admin_deleted_specialisation',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { specialisation: spec.name },
      })
      addToast('Specialisation deleted', 'success')
      refetchSpecialisations()
    } catch (err) {
      addToast(err.message || 'Failed to delete. It may have dependent records.', 'error')
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-text)' }}>
          Specialisations
        </h2>
        <Button onClick={openCreate}>Add Specialisation</Button>
      </div>

      <div style={{ marginBottom: 16, maxWidth: 300 }}>
        <Select
          label="Filter by Branch"
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          options={branchOptions}
          placeholder="All Branches"
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Branch</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created At</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(spec => (
              <tr key={spec.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <td style={tdStyle}>{spec.name}</td>
                <td style={tdStyle}>{spec.code}</td>
                <td style={tdStyle}>{branches.find(b => b.id === spec.branch_id)?.name}</td>
                <td style={tdStyle}>
                  <span className={`badge ${spec.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                    {spec.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle}>{formatDate(spec.created_at)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" onClick={() => openEdit(spec)} style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}>
                      Edit
                    </Button>
                    <Button
                      variant={spec.is_active ? 'danger' : 'success'}
                      onClick={() => toggleActive(spec)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      {spec.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(spec)}
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
                <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  No specialisations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Specialisation' : 'Add Specialisation'}>
        <Select
          label="Branch"
          value={form.branch_id}
          onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
          options={branchOptions}
          placeholder="Select Branch"
        />
        <Input
          label="Specialisation Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Data Science"
        />
        <Input
          label="Code"
          value={form.code}
          onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
          placeholder="e.g. DS"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </Modal>
    </div>
  )
}
