import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { logAction } from '../../utils/logAction'
import { sanitizeText, sanitizeRollNumber } from '../../utils/validators'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'
import Button from '../ui/Button'
import Select from '../ui/Select'
import Spinner from '../ui/Spinner'
import { Upload, FileText, CheckCircle, Download } from 'lucide-react'
import Papa from 'papaparse'

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

export default function CSVUploader() {
  const { addToast } = useToast()
  const fileRef = useRef(null)
  const { activeBranches: branches, activeSpecs: specs, activeSections: sections, activeBatches: batches, loading: loadingOptions } = useData()

  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedSpec, setSelectedSpec] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')

  const [parsedRows, setParsedRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const filteredSpecs = selectedBranch
    ? specs.filter(s => s.branch_id === selectedBranch)
    : []

  const filteredSections = selectedSpec
    ? sections.filter(s => s.specialisation_id === selectedSpec)
    : []

  const handleFile = (file) => {
    if (!file) return

    if (file.size > 1024 * 1024) {
      addToast(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 1MB.`, 'error')
      return
    }

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'txt'].includes(ext)) {
      addToast('Only .csv and .txt files are supported', 'error')
      return
    }

    setFileName(file.name)
    setResult(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields.map(h => h.toLowerCase().trim())

        if (!headers.includes('roll number') && !headers.includes('rollnumber') && !headers.includes('roll_number')) {
          addToast('CSV must have a "Roll Number" column', 'error')
          setParsedRows([])
          return
        }
        if (!headers.includes('name') && !headers.includes('full_name') && !headers.includes('student name')) {
          addToast('CSV must have a "Name" column', 'error')
          setParsedRows([])
          return
        }

        const rollKey = results.meta.fields.find(h => {
          const l = h.toLowerCase().trim()
          return l === 'roll number' || l === 'rollnumber' || l === 'roll_number'
        })
        const nameKey = results.meta.fields.find(h => {
          const l = h.toLowerCase().trim()
          return l === 'name' || l === 'full_name' || l === 'student name'
        })

        const rows = results.data
          .map(row => ({
            roll_number: sanitizeRollNumber(row[rollKey]),
            full_name: sanitizeText(row[nameKey]),
          }))
          .filter(r => r.roll_number && r.full_name)

        if (rows.length > 500) {
          addToast(`Too many rows (${rows.length}). Maximum 500 per upload.`, 'error')
          setParsedRows([])
          return
        }

        if (rows.length === 0) {
          addToast('No valid rows found in the file', 'error')
        }

        setParsedRows(rows)
      },
      error: () => {
        addToast('Failed to parse file', 'error')
      },
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleUpload = async () => {
    if (!selectedBranch || !selectedSpec || !selectedSection || !selectedBatch) {
      addToast('Please select all filters first', 'error')
      return
    }
    if (parsedRows.length === 0) {
      addToast('No data to upload', 'error')
      return
    }

    setUploading(true)
    try {
      const rollNumbers = parsedRows.map(r => r.roll_number)
      const { data: existing } = await supabase
        .from('students')
        .select('roll_number')
        .in('roll_number', rollNumbers)

      const existingRolls = new Set((existing || []).map(e => e.roll_number))
      const newRows = parsedRows.filter(r => !existingRolls.has(r.roll_number))
      const skippedRolls = parsedRows.filter(r => existingRolls.has(r.roll_number)).map(r => r.roll_number)

      if (newRows.length > 0) {
        const inserts = newRows.map(r => ({
          roll_number: r.roll_number,
          full_name: r.full_name,
          branch_id: selectedBranch,
          specialisation_id: selectedSpec,
          section_id: selectedSection,
          batch_year: parseInt(selectedBatch, 10),
          is_active: true,
        }))

        const { error } = await supabase.from('students').insert(inserts)
        if (error) throw error
      }

      await logAction({
        actionType: 'admin_uploaded_students',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: {
          total: parsedRows.length,
          added: newRows.length,
          skipped: skippedRolls.length,
          file: fileName,
        },
      })

      setResult({
        added: newRows.length,
        skipped: skippedRolls.length,
        skippedRolls,
      })
      addToast(`Upload complete: ${newRows.length} added, ${skippedRolls.length} skipped`, 'success')
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  if (loadingOptions) return <Spinner />

  return (
    <div>
      <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 24 }}>
        Upload Students
      </h2>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--color-text)', marginBottom: 16 }}>
          Step 1: Select Target
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <Select
            label="Branch"
            value={selectedBranch}
            onChange={e => { setSelectedBranch(e.target.value); setSelectedSpec(''); setSelectedSection('') }}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            placeholder="Select Branch"
          />
          <Select
            label="Specialisation"
            value={selectedSpec}
            onChange={e => { setSelectedSpec(e.target.value); setSelectedSection('') }}
            options={filteredSpecs.map(s => ({ value: s.id, label: s.name }))}
            placeholder={selectedBranch ? 'Select Specialisation' : 'Select branch first'}
          />
          <Select
            label="Section"
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            options={filteredSections.map(s => ({ value: s.id, label: s.name }))}
            placeholder={selectedSpec ? 'Select Section' : 'Select specialisation first'}
          />
          <Select
            label="Batch Year"
            value={selectedBatch}
            onChange={e => setSelectedBatch(e.target.value)}
            options={batches.map(b => ({ value: String(b.batch_year), label: String(b.batch_year) }))}
            placeholder="Select Batch"
          />
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--color-text)', marginBottom: 16 }}>
          Step 2: Upload File
        </h3>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-gold)' : 'var(--color-border-light)'}`,
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(201,168,76,0.05)' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <Upload size={32} style={{ color: 'var(--color-text-muted)', marginBottom: 12, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          <p style={{ color: 'var(--color-text)', fontWeight: 500 }}>
            {fileName || 'Drag & drop a CSV file here, or click to browse'}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Accepts .csv and .txt files with "Roll Number" and "Name" columns
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={14} style={{ color: 'var(--color-gold)' }} />
          <a
            href="/student_list.csv"
            download="student_list_example.csv"
            style={{
              color: 'var(--color-gold)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
            onClick={e => e.stopPropagation()}
          >
            Download example CSV
          </a>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
            — Use this as a template for your upload
          </span>
        </div>
      </div>

      {parsedRows.length > 0 && !result && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--color-text)', marginBottom: 16 }}>
            Step 3: Preview ({parsedRows.length} rows)
          </h3>
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Roll Number</th>
                  <th style={thStyle}>Name</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 10).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{row.roll_number}</td>
                    <td style={tdStyle}>{row.full_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 10 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 8 }}>
                ...and {parsedRows.length - 10} more rows
              </p>
            )}
          </div>
          <Button onClick={handleUpload} loading={uploading}>
            <FileText size={16} style={{ marginRight: 6 }} />
            Confirm Upload ({parsedRows.length} students)
          </Button>
        </div>
      )}

      {result && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--color-success)' }}>
              Upload Complete
            </h3>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', marginBottom: 8 }}>
            <strong>{result.added}</strong> students added, <strong>{result.skipped}</strong> skipped (duplicates)
          </p>
          {result.skippedRolls.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                Skipped Roll Numbers:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {result.skippedRolls.map(roll => (
                  <span
                    key={roll}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'var(--color-border-light)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {roll}
                  </span>
                ))}
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={() => { setParsedRows([]); setResult(null); setFileName(''); if (fileRef.current) fileRef.current.value = '' }}
            style={{ marginTop: 16 }}
          >
            Upload More
          </Button>
        </div>
      )}
    </div>
  )
}
