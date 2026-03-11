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

export default function SemesterManager() {
  const { addToast } = useToast()
  const { semesters, refetchSemesters, loading } = useData()
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ number: '', name: '' })

  const sortedSemesters = useMemo(() =>
    [...semesters].sort((a, b) => a.number - b.number),
    [semesters]
  )

  const openCreate = () => {
    setForm({ number: '', name: '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const num = parseInt(form.number, 10)
    const name = sanitizeText(form.name)

    if (!num || num < 1 || num > 8) {
      addToast('Semester number must be between 1 and 8', 'error')
      return
    }
    if (!name) {
      addToast('Semester name is required', 'error')
      return
    }

    const exists = semesters.some(s => s.number === num)
    if (exists) {
      addToast('This semester number already exists', 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('semesters')
        .insert({ number: num, name, is_active: true })

      if (error) throw error

      await logAction({
        actionType: 'admin_created_semester',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { semester_number: num, name },
      })
      addToast('Semester created successfully', 'success')
      setModalOpen(false)
      refetchSemesters()
    } catch (err) {
      addToast(err.message || 'Failed to save semester', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (semester) => {
    try {
      const { error } = await supabase
        .from('semesters')
        .update({ is_active: !semester.is_active })
        .eq('id', semester.id)

      if (error) throw error

      await logAction({
        actionType: 'admin_toggled_semester',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { action: semester.is_active ? 'deactivated' : 'activated', semester: semester.name },
      })
      addToast(`Semester ${semester.is_active ? 'deactivated' : 'activated'}`, 'success')
      refetchSemesters()
    } catch (err) {
      addToast(err.message || 'Failed to update', 'error')
    }
  }

  const handleDelete = async (semester) => {
    if (!window.confirm(`Permanently delete semester "${semester.name}"?\n\n⚠️ This will fail if any fee requests or sections reference this semester. Deleting semesters with past data is NOT recommended. Consider deactivating instead.`)) return
    try {
      const { error } = await supabase.from('semesters').delete().eq('id', semester.id)
      if (error) throw error
      await logAction({
        actionType: 'admin_deleted_semester',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { semester: semester.name },
      })
      addToast('Semester deleted', 'success')
      refetchSemesters()
    } catch (err) {
      addToast(err.message || 'Failed to delete. It may have dependent records.', 'error')
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-text)' }}>
          Semesters
        </h2>
        <Button onClick={openCreate}>Add Semester</Button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <th style={thStyle}>Number</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created At</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSemesters.map(sem => (
              <tr key={sem.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <td style={tdStyle}>{sem.number}</td>
                <td style={tdStyle}>{sem.name}</td>
                <td style={tdStyle}>
                  <span className={`badge ${sem.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                    {sem.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle}>{formatDate(sem.created_at)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                      variant={sem.is_active ? 'danger' : 'success'}
                      onClick={() => toggleActive(sem)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      {sem.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(sem)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedSemesters.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  No semesters found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Semester">
        <Input
          label="Semester Number (1-8)"
          type="number"
          value={form.number}
          onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
          placeholder="e.g. 3"
        />
        <Input
          label="Semester Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Semester 3"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </Modal>
    </div>
  )
}
