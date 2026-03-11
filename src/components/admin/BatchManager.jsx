import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { logAction } from '../../utils/logAction'
import { formatDate, formatCurrency } from '../../utils/formatters'
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

export default function BatchManager() {
  const { addToast } = useToast()
  const { batchConfigs: batches, refetchBatches, loading } = useData()
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ batch_year: '', fee_amount: '' })

  const sortedBatches = useMemo(() =>
    [...batches].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [batches]
  )

  const openCreate = () => {
    setEditing(null)
    setForm({ batch_year: '', fee_amount: '' })
    setModalOpen(true)
  }

  const openEdit = (batch) => {
    setEditing(batch)
    setForm({ batch_year: String(batch.batch_year), fee_amount: String(batch.fee_amount) })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const batchYear = parseInt(form.batch_year, 10)
    const feeAmount = parseFloat(form.fee_amount)

    if (!batchYear || String(batchYear).length !== 4) {
      addToast('Enter a valid 4-digit batch year', 'error')
      return
    }
    if (!feeAmount || feeAmount <= 0) {
      addToast('Enter a valid fee amount', 'error')
      return
    }

    if (!editing) {
      const exists = batches.some(b => b.batch_year === batchYear)
      if (exists) {
        addToast('This batch year already exists', 'error')
        return
      }
    }

    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from('batch_configs')
          .update({ fee_amount: feeAmount })
          .eq('id', editing.id)

        if (error) throw error

        await logAction({
          actionType: 'admin_updated_batch',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { action: 'updated', batch_year: batchYear, fee_amount: feeAmount },
        })
        addToast('Batch config updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('batch_configs')
          .insert({ batch_year: batchYear, fee_amount: feeAmount, is_active: true })

        if (error) throw error

        await logAction({
          actionType: 'admin_created_batch',
          performedByRole: 'admin',
          performedByName: 'Administrator',
          details: { batch_year: batchYear, fee_amount: feeAmount },
        })
        addToast('Batch year created successfully', 'success')
      }

      setModalOpen(false)
      refetchBatches()
    } catch (err) {
      addToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (batch) => {
    try {
      const { error } = await supabase
        .from('batch_configs')
        .update({ is_active: !batch.is_active })
        .eq('id', batch.id)

      if (error) throw error

      await logAction({
        actionType: 'admin_toggled_batch',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { action: batch.is_active ? 'deactivated' : 'activated', batch_year: batch.batch_year },
      })
      addToast(`Batch ${batch.is_active ? 'deactivated' : 'activated'}`, 'success')
      refetchBatches()
    } catch (err) {
      addToast(err.message || 'Failed to update', 'error')
    }
  }

  const handleDelete = async (batch) => {
    if (!window.confirm(`Permanently delete batch year ${batch.batch_year} (fee: ₹${batch.fee_amount})?\n\nThis removes the fee configuration. Students in this batch year will no longer have a fee amount set. Consider deactivating instead to preserve historical data.`)) return
    try {
      const { error } = await supabase.from('batch_configs').delete().eq('id', batch.id)
      if (error) throw error
      await logAction({
        actionType: 'admin_deleted_batch',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { batch_year: batch.batch_year },
      })
      addToast('Batch year deleted', 'success')
      refetchBatches()
    } catch (err) {
      addToast(err.message || 'Failed to delete. It may have dependent records.', 'error')
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-text)' }}>
          Batch Years & Fees
        </h2>
        <Button onClick={openCreate}>Add Batch Year</Button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <th style={thStyle}>Batch Year</th>
              <th style={thStyle}>Fee Amount</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created At</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedBatches.map(batch => (
              <tr key={batch.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <td style={tdStyle}>{batch.batch_year}</td>
                <td style={tdStyle}>{formatCurrency(batch.fee_amount)}</td>
                <td style={tdStyle}>
                  <span className={`badge ${batch.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                    {batch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle}>{formatDate(batch.created_at)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" onClick={() => openEdit(batch)} style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}>
                      Edit Fee
                    </Button>
                    <Button
                      variant={batch.is_active ? 'danger' : 'success'}
                      onClick={() => toggleActive(batch)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      {batch.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(batch)}
                      style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedBatches.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  No batch configs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Batch Fee' : 'Add Batch Year'}>
        <Input
          label="Batch Year"
          type="number"
          value={form.batch_year}
          onChange={e => setForm(f => ({ ...f, batch_year: e.target.value }))}
          placeholder="e.g. 2024"
          disabled={!!editing}
        />
        <Input
          label="Fee Amount (₹)"
          type="number"
          value={form.fee_amount}
          onChange={e => setForm(f => ({ ...f, fee_amount: e.target.value }))}
          placeholder="e.g. 15000"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </Modal>
    </div>
  )
}
