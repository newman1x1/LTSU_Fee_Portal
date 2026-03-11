import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { logAction } from '../../utils/logAction'
import { formatDate } from '../../utils/formatters'
import { sanitizeText } from '../../utils/validators'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'
import Button from '../ui/Button'
import Input from '../ui/Input'
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

export default function BranchManager() {
  const { addToast } = useToast()
  const { branches, refetchBranches, loading } = useData()
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '' })

  const sortedBranches = useMemo(() =>
    [...branches].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [branches]
  )

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', code: '' })
    setModalOpen(true)
  }

  const openEdit = (branch) => {
    setEditing(branch)
    setForm({ name: branch.name, code: branch.code })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const name = sanitizeText(form.name)
    const code = sanitizeText(form.code)

    if (!name || !code) {
      addToast('Name and Code are required', 'error')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from('branches')
          .update({ name, code })
          .eq('id', editing.id)

        if (error) throw error

        await logAction({
          actionType: 'admin_updated_branch',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { action: 'updated', branch: name, code },
        })
        addToast('Branch updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('branches')
          .insert({ name, code, is_active: true })

        if (error) throw error

        await logAction({
          actionType: 'admin_created_branch',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { branch: name, code },
        })
        addToast('Branch created successfully', 'success')
      }

      setModalOpen(false)
      refetchBranches()
    } catch (err) {
      addToast(err.message || 'Failed to save branch', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (branch) => {
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active: !branch.is_active })
        .eq('id', branch.id)

      if (error) throw error

      await logAction({
        actionType: 'admin_toggled_branch',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { action: branch.is_active ? 'deactivated' : 'activated', branch: branch.name },
      })
      addToast(`Branch ${branch.is_active ? 'deactivated' : 'activated'}`, 'success')
      refetchBranches()
    } catch (err) {
      addToast(err.message || 'Failed to update branch', 'error')
    }
  }

  const handleDelete = async (branch) => {
    if (!window.confirm(`Permanently delete branch "${branch.name}"?\n\nThis will fail if any specialisations, sections, or students still reference this branch. Consider deactivating instead to preserve historical data.`)) return
    try {
      const { error } = await supabase.from('branches').delete().eq('id', branch.id)
      if (error) throw error
      await logAction({
        actionType: 'admin_deleted_branch',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { branch: branch.name },
      })
      addToast('Branch deleted', 'success')
      refetchBranches()
    } catch (err) {
      addToast(err.message || 'Failed to delete branch. It may have dependent records.', 'error')
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-text)' }}>
          Branches
        </h2>
        <Button onClick={openCreate}>Add Branch</Button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created At</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedBranches.map(branch => (
              <tr key={branch.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <td style={tdStyle}>{branch.name}</td>
                <td style={tdStyle}>{branch.code}</td>
                <td style={tdStyle}>
                  <span className={`badge ${branch.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle}>{formatDate(branch.created_at)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" onClick={() => openEdit(branch)} style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}>
                      Edit
                    </Button>
                    <Button
                      variant={branch.is_active ? 'danger' : 'success'}
                      onClick={() => toggleActive(branch)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      {branch.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(branch)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedBranches.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  No branches found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Branch' : 'Add Branch'}>
        <Input
          label="Branch Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Computer Science"
        />
        <Input
          label="Branch Code"
          value={form.code}
          onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
          placeholder="e.g. CSE"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </Modal>
    </div>
  )
}
