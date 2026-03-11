export const exportCSV = ({ title, columns, data }) => {
  const sanitizeCell = (cell) => {
    const str = String(cell ?? '')
    return /^[=+\-@\t\r]/.test(str) ? "'" + str : str
  }
  const rows = [columns, ...data]
  const csv = rows.map(row =>
    row.map(cell => {
      const safe = sanitizeCell(cell)
      return safe.includes(',') || safe.includes('"') || safe.includes('\n')
        ? '"' + safe.replace(/"/g, '""') + '"'
        : safe
    }).join(',')
  ).join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_')}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
