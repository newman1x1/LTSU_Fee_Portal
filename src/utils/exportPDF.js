export const exportTablePDF = async ({ title, columns, data, exportedBy, sectionName }) => {
  if (!data?.length) return
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF('l', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Lamrin Tech Skills University Punjab', pageWidth / 2, 15, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(title, pageWidth / 2, 23, { align: 'center' })

  if (sectionName) {
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Section: ${sectionName}`, pageWidth / 2, 29, { align: 'center' })
    doc.setTextColor(0, 0, 0)
  }

  const startY = sectionName ? 34 : 30

  autoTable(doc, {
    head: [columns],
    body: data,
    startY,
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [11, 27, 62], textColor: [201, 168, 76], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 246, 238] },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
    didDrawPage: (hookData) => {
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Page ${hookData.pageNumber}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      )
    },
  })

  let footerY = (doc.lastAutoTable?.finalY || startY) + 10
  // If footer would overflow past the page, add a new page
  if (footerY > pageHeight - 15) {
    doc.addPage()
    footerY = 20
  }
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(
    `Exported by: ${exportedBy || 'N/A'} | Section: ${sectionName || 'All'} | Date: ${new Date().toLocaleDateString('en-IN')} | Total: ${data.length} rows`,
    14,
    footerY
  )

  doc.save(`${title.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_')}.pdf`)
}
