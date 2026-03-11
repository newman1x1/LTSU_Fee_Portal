export const exportExcel = async ({ title, columns, data, sheetName = 'Data' }) => {
  const XLSX = await import('xlsx')
  const sanitizeCell = (cell) => {
    const str = String(cell ?? '')
    return /^[=+\-@\t\r]/.test(str) ? "'" + str : str
  }
  const wb = XLSX.utils.book_new()

  const summaryData = [
    ['Lamrin Tech Skills University Punjab'],
    [title],
    [`Exported: ${new Date().toLocaleDateString('en-IN')}`],
    [`Total Records: ${data.length}`],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  const wsData = [columns, ...data.map(row => row.map(sanitizeCell))]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}.xlsx`)
}
