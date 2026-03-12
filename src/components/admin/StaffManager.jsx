import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { logAction } from '../../utils/logAction'
import { sanitizeText, isValidEmail } from '../../utils/validators'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Modal from '../ui/Modal'
import Tabs from '../ui/Tabs'
import Spinner from '../ui/Spinner'
import { X, Wand2 } from 'lucide-react'

const secureRandom = (max) => {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % max
}

const generateStaffId = (role) => {
  const prefix = role === 'teacher' ? 'TCH' : 'CR'
  const stamp = Date.now().toString(36).toUpperCase().slice(-4)
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map(b => (b % 36).toString(36).toUpperCase())
    .join('')
  return `${prefix}-${stamp}${rand}`
}

const generatePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*'
  const all = upper + lower + digits + symbols
  const pick = (s) => s[secureRandom(s.length)]
  let pw = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  for (let i = 0; i < 8; i++) pw.push(pick(all))
  for (let i = pw.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [pw[i], pw[j]] = [pw[j], pw[i]]
  }
  return pw.join('')
}

const genLinkStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 8px', border: 'none',
  borderRadius: 4, background: 'rgba(201,168,76,0.10)',
  color: 'var(--color-gold)', fontSize: 11,
  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'background 0.15s, color 0.15s',
  lineHeight: 1,
}

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

export default function StaffManager() {
  const { addToast } = useToast()
  const { activeBranches: branches, activeSpecs: specs, activeSections: sections } = useData()
  const [activeTab, setActiveTab] = useState('cr')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, user: null })
  const [resetModal, setResetModal] = useState({ open: false, user: null })
  const [newPassword, setNewPassword] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    staff_id: '',
    password: '',
    branch_id: '',
    specialisation_id: '',
    section_id: '',
    assignedSections: [],
  })
  const [editForm, setEditForm] = useState({
    branch_id: '',
    specialisation_id: '',
    section_id: '',
    assignedSections: [],
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('*, user_sections!user_sections_user_id_fkey(section_id, sections(id, name, branch_id, specialisation_id, branches(name), specialisations(name), semesters(name)))')
        .order('created_at', { ascending: false })

      if (userErr) console.error('Users query error:', userErr)
      setUsers(userData || [])
    } catch (err) {
      addToast('Failed to load staff data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const crs = users.filter(u => u.role === 'cr')
  const teachers = users.filter(u => u.role === 'teacher')

  const branchOptions = branches.map(b => ({ value: b.id, label: b.name }))

  const filteredSpecs = form.branch_id
    ? specs.filter(s => s.branch_id === form.branch_id)
    : []

  const filteredSections = form.specialisation_id
    ? sections.filter(s => s.specialisation_id === form.specialisation_id)
    : []

  const openCreateModal = () => {
    setForm({
      full_name: '',
      email: '',
      staff_id: '',
      password: '',
      branch_id: '',
      specialisation_id: '',
      section_id: '',
      assignedSections: [],
    })
    setCreateModal(true)
  }

  const addSectionToTeacher = () => {
    if (!form.section_id) return
    const sec = sections.find(s => s.id === form.section_id)
    if (!sec) return
    if (form.assignedSections.some(s => s.id === sec.id)) {
      addToast('Section already added', 'warning')
      return
    }
    setForm(f => ({
      ...f,
      assignedSections: [...f.assignedSections, sec],
      section_id: '',
    }))
  }

  const removeSectionFromTeacher = (sectionId) => {
    setForm(f => ({
      ...f,
      assignedSections: f.assignedSections.filter(s => s.id !== sectionId),
    }))
  }

  const handleCreate = async () => {
    const fullName = sanitizeText(form.full_name)
    const email = form.email.trim().toLowerCase()
    const staffId = sanitizeText(form.staff_id)
    const password = form.password

    if (!fullName || !email || !staffId || !password) {
      addToast('All fields are required', 'error')
      return
    }
    if (!isValidEmail(email)) {
      addToast('Invalid email address', 'error')
      return
    }
    if (password.length < 6) {
      addToast('Password must be at least 6 characters', 'error')
      return
    }

    const role = activeTab
    let sectionIds = []

    if (role === 'cr') {
      if (!form.section_id) {
        addToast('Please assign a section to this CR', 'error')
        return
      }
      sectionIds = [form.section_id]
    } else {
      if (form.assignedSections.length === 0) {
        addToast('Please assign at least one section', 'error')
        return
      }
      sectionIds = form.assignedSections.map(s => s.id)
    }

    setSaving(true)
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'create_user',
          email,
          password,
          fullName,
          role,
          staffId,
          sectionIds,
        },
      })

      if (fnError || result?.error) {
        throw new Error(result?.error || fnError?.message || 'Failed to create account')
      }

      await logAction({
        actionType: role === 'cr' ? 'admin_created_cr' : 'admin_created_teacher',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { name: fullName, staff_id: staffId, sections: sectionIds.length },
      })

      addToast(`${role.toUpperCase()} account created successfully`, 'success')
      setCreateModal(false)
      fetchUsers()
    } catch (err) {
      addToast(err.message || 'Failed to create account', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error')
      return
    }

    setSaving(true)
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'reset_password',
          userId: resetModal.user.id,
          newPassword,
        },
      })

      if (fnError || result?.error) {
        throw new Error(result?.error || fnError?.message || 'Failed to reset password')
      }

      await logAction({
        actionType: 'admin_reset_password',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { target_user: resetModal.user.full_name },
      })

      addToast('Password reset successfully', 'success')
      setResetModal({ open: false, user: null })
      setNewPassword('')
    } catch (err) {
      addToast(err.message || 'Failed to reset password. This may require a service-role key or Edge Function.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user) => {
    try {
      const newStatus = !user.is_active
      const { error } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', user.id)

      if (error) throw error

      await logAction({
        actionType: 'admin_toggled_staff',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { action: newStatus ? 'activated' : 'deactivated', staff_name: user.full_name, role: user.role },
      })

      addToast(`${user.full_name} ${user.is_active ? 'deactivated' : 'activated'}`, 'success')
      fetchUsers()
    } catch (err) {
      addToast(err.message || 'Failed to update', 'error')
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Permanently delete ${user.role.toUpperCase()} account "${user.full_name}"?\n\nThis will remove their section assignments, user profile, and auth account. Any fee requests they previously reviewed will lose their reviewer reference.\n\nConsider deactivating instead to preserve audit history.`)) return
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_user', userId: user.id },
      })
      if (fnError || result?.error) {
        throw new Error(result?.error || fnError?.message || 'Failed to delete account')
      }

      await logAction({
        actionType: 'admin_deleted_staff',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { staff_name: user.full_name, role: user.role, staff_id: user.staff_id },
      })
      addToast(`${user.full_name} deleted`, 'success')
      fetchUsers()
    } catch (err) {
      addToast(err.message || 'Failed to delete staff account', 'error')
    }
  }

  /* ── Edit section assignments ── */
  const editFilteredSpecs = editForm.branch_id
    ? specs.filter(s => s.branch_id === editForm.branch_id)
    : []

  const editFilteredSections = editForm.specialisation_id
    ? sections.filter(s => s.specialisation_id === editForm.specialisation_id)
    : []

  const openEditModal = (user) => {
    const currentSections = (user.user_sections || [])
      .map(us => us.sections)
      .filter(Boolean)
    setEditForm({
      branch_id: '',
      specialisation_id: '',
      section_id: '',
      assignedSections: currentSections,
    })
    setEditModal({ open: true, user })
  }

  const addEditSection = () => {
    if (!editForm.section_id) return
    const sec = sections.find(s => s.id === editForm.section_id)
    if (!sec) return
    if (editForm.assignedSections.some(s => s.id === sec.id)) {
      addToast('Section already added', 'warning')
      return
    }
    setEditForm(f => ({
      ...f,
      assignedSections: [...f.assignedSections, sec],
      section_id: '',
    }))
  }

  const removeEditSection = (sectionId) => {
    setEditForm(f => ({
      ...f,
      assignedSections: f.assignedSections.filter(s => s.id !== sectionId),
    }))
  }

  const handleEditSave = async () => {
    const user = editModal.user
    if (!user) return

    if (editForm.assignedSections.length === 0) {
      addToast('Please assign at least one section', 'error')
      return
    }

    setSaving(true)
    try {
      // Remove existing section assignments
      const { error: delErr } = await supabase
        .from('user_sections')
        .delete()
        .eq('user_id', user.id)
      if (delErr) throw delErr

      // Insert new section assignments
      const rows = editForm.assignedSections.map(sec => ({
        user_id: user.id,
        section_id: sec.id,
      }))
      const { error: insErr } = await supabase.from('user_sections').insert(rows)
      if (insErr) throw insErr

      await logAction({
        actionType: 'admin_updated_staff_sections',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: {
          staff_name: user.full_name,
          role: user.role,
          sections: editForm.assignedSections.map(s => s.name),
        },
      })

      await fetchUsers()
      addToast(`Section assignments updated for ${user.full_name}`, 'success')
      setEditModal({ open: false, user: null })
    } catch (err) {
      addToast(err.message || 'Failed to update section assignments', 'error')
    } finally {
      setSaving(false)
    }
  }

  const renderTable = (list) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
            <th style={thStyle}>Staff ID</th>
            <th style={thStyle}>Full Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Sections</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(user => (
            <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <td style={tdStyle}>{user.staff_id}</td>
              <td style={tdStyle}>{user.full_name}</td>
              <td style={tdStyle}>{user.email}</td>
              <td style={tdStyle}>
                {user.user_sections?.map(us => {
                  const sec = us.sections
                  if (!sec) return null
                  return `${sec.name} (${sec.branches?.name || ''})`
                }).filter(Boolean).join(', ') || '—'}
              </td>
              <td style={tdStyle}>
                <span className={`badge ${user.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {user.role === 'teacher' && (
                    <Button
                      variant="ghost"
                      onClick={() => openEditModal(user)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => { setResetModal({ open: true, user }); setNewPassword('') }}
                    style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                  >
                    Reset PW
                  </Button>
                  <Button
                    variant={user.is_active ? 'danger' : 'success'}
                    onClick={() => toggleActive(user)}
                    style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(user)}
                    style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                No {activeTab === 'cr' ? 'CR' : 'teacher'} accounts found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-text)' }}>
          Staff Accounts
        </h2>
        <Button onClick={openCreateModal}>
          Create {activeTab === 'cr' ? 'CR' : 'Teacher'} Account
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'cr', label: 'CRs', count: crs.length },
          { id: 'teacher', label: 'Teachers', count: teachers.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'cr' ? renderTable(crs) : renderTable(teachers)}

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title={`Create ${activeTab === 'cr' ? 'CR' : 'Teacher'} Account`} maxWidth={620}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Input
            label="Full Name"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="e.g. John Doe"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="e.g. john@university.edu"
          />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Staff ID</label>
              <button
                type="button"
                style={genLinkStyle}
                onClick={() => setForm(f => ({ ...f, staff_id: generateStaffId(activeTab) }))}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,168,76,0.10)'}
              >
                <Wand2 size={11} /> Generate
              </button>
            </div>
            <div className="mb-4">
              <input
                className="input-field"
                value={form.staff_id}
                onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
                placeholder="e.g. STF001"
              />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
              <button
                type="button"
                style={genLinkStyle}
                onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,168,76,0.10)'}
              >
                <Wand2 size={11} /> Generate
              </button>
            </div>
            <Input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min 6 characters"
            />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 16, marginTop: 8 }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)', marginBottom: 8 }}>
            {activeTab === 'cr' ? 'Assign Section' : 'Assign Sections'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
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
              options={filteredSpecs.map(s => ({ value: s.id, label: s.name }))}
              placeholder={form.branch_id ? 'Select Spec' : 'Branch first'}
            />
            <Select
              label="Section"
              value={form.section_id}
              onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
              options={filteredSections.map(s => ({ value: s.id, label: s.name }))}
              placeholder={form.specialisation_id ? 'Select Section' : 'Spec first'}
            />
          </div>

          {activeTab === 'teacher' && (
            <>
              <Button variant="secondary" onClick={addSectionToTeacher} style={{ marginBottom: 8, padding: '6px 14px', fontSize: 'var(--text-sm)' }}>
                + Add Section
              </Button>
              {form.assignedSections.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {form.assignedSections.map(sec => (
                    <span
                      key={sec.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'var(--color-border-light)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text)',
                      }}
                    >
                      {sec.name} ({branches.find(b => b.id === sec.branch_id)?.name} · {specs.find(sp => sp.id === sec.specialisation_id)?.name})
                      <button
                        onClick={() => removeSectionFromTeacher(sec.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--color-error)' }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setCreateModal(false)}>Cancel</Button>
          <Button onClick={handleCreate} loading={saving}>Create Account</Button>
        </div>
      </Modal>

      <Modal isOpen={resetModal.open} onClose={() => setResetModal({ open: false, user: null })} title="Reset Password">
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Reset password for <strong>{resetModal.user?.full_name}</strong> ({resetModal.user?.email})
        </p>
        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="Min 6 characters"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setResetModal({ open: false, user: null })}>Cancel</Button>
          <Button onClick={handleResetPassword} loading={saving}>Reset Password</Button>
        </div>
      </Modal>

      {/* ── Edit Section Assignments Modal ── */}
      <Modal isOpen={editModal.open} onClose={() => setEditModal({ open: false, user: null })} title={`Edit Sections — ${editModal.user?.full_name || ''}`} maxWidth={560}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Update sections for <strong>{editModal.user?.full_name}</strong>. A Teacher can be assigned to multiple sections.
        </p>

        <div>
            {editForm.assignedSections.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {editForm.assignedSections.map(sec => (
                  <span
                    key={sec.id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 6,
                      background: 'var(--color-border-light)',
                      fontSize: 'var(--text-xs)', color: 'var(--color-text)',
                    }}
                  >
                    {sec.name} ({sec.branches?.name || branches.find(b => b.id === sec.branch_id)?.name || ''} · {sec.specialisations?.name || specs.find(sp => sp.id === sec.specialisation_id)?.name || ''})
                    <button
                      onClick={() => removeEditSection(sec.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--color-error)' }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {editForm.assignedSections.length === 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginBottom: 12 }}>No sections assigned. Add at least one.</p>
            )}

            <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 12 }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)', marginBottom: 8 }}>Add Section</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
                <Select
                  label="Branch"
                  value={editForm.branch_id}
                  onChange={e => setEditForm(f => ({ ...f, branch_id: e.target.value, specialisation_id: '', section_id: '' }))}
                  options={branchOptions}
                  placeholder="Select Branch"
                />
                <Select
                  label="Specialisation"
                  value={editForm.specialisation_id}
                  onChange={e => setEditForm(f => ({ ...f, specialisation_id: e.target.value, section_id: '' }))}
                  options={editFilteredSpecs.map(s => ({ value: s.id, label: s.name }))}
                  placeholder={editForm.branch_id ? 'Select Spec' : 'Branch first'}
                />
                <Select
                  label="Section"
                  value={editForm.section_id}
                  onChange={e => setEditForm(f => ({ ...f, section_id: e.target.value }))}
                  options={editFilteredSections.map(s => ({ value: s.id, label: s.name }))}
                  placeholder={editForm.specialisation_id ? 'Select Section' : 'Spec first'}
                />
              </div>
              <Button variant="secondary" onClick={addEditSection} style={{ marginTop: 4, padding: '6px 14px', fontSize: 'var(--text-sm)' }}>
                + Add Section
              </Button>
            </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setEditModal({ open: false, user: null })}>Cancel</Button>
          <Button onClick={handleEditSave} loading={saving}>Save Changes</Button>
        </div>
      </Modal>
    </div>
  )
}
