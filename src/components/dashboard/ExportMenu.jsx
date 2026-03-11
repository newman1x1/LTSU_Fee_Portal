import { Download } from 'lucide-react'
import { useState } from 'react'
import Button from '../ui/Button'

export default function ExportMenu({ title, columns, data, exportedBy, sectionName }) {
  const [exporting, setExporting] = useState(null)

  const handleExport = async (type) => {
    setExporting(type)
    try {
      if (type === 'pdf') {
        const { exportTablePDF } = await import('../../utils/exportPDF')
        await exportTablePDF({ title, columns, data, exportedBy, sectionName })
      } else if (type === 'excel') {
        const { exportExcel } = await import('../../utils/exportExcel')
        await exportExcel({ title, columns, data })
      } else if (type === 'csv') {
        const { exportCSV } = await import('../../utils/exportCSV')
        exportCSV({ title, columns, data })
      }
    } catch (err) {
      console.error(`Export ${type} failed:`, err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <Button variant="ghost" onClick={() => handleExport('pdf')} disabled={!!exporting}
        style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', minHeight: 44 }}>
        <Download size={14} /> {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
      </Button>
      <Button variant="ghost" onClick={() => handleExport('excel')} disabled={!!exporting}
        style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', minHeight: 44 }}>
        <Download size={14} /> {exporting === 'excel' ? 'Exporting...' : 'Excel'}
      </Button>
      <Button variant="ghost" onClick={() => handleExport('csv')} disabled={!!exporting}
        style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', minHeight: 44 }}>
        <Download size={14} /> {exporting === 'csv' ? 'Exporting...' : 'CSV'}
      </Button>
    </div>
  )
}
