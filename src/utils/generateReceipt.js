export const generateReceipt = async (data) => {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 25

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Lamrin Tech Skills University Punjab', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setDrawColor(201, 168, 76)
  doc.setLineWidth(0.5)
  doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y)
  y += 8

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('SEMESTER REGISTRATION FEE RECEIPT', pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const addRow = (label, value) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(':  ' + (value || ''), margin + 55, y)
    y += 7
  }

  addRow('Reference Number', data.referenceNumber)
  addRow('Date of Approval', data.approvedDate)
  y += 4

  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('STUDENT DETAILS', margin, y)
  y += 4
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8
  doc.setFontSize(10)

  addRow('Student Name', data.studentName)
  addRow('Roll Number', data.rollNumber)
  addRow('Batch Year', String(data.batchYear ?? ''))
  addRow('Branch', data.branchName)
  addRow('Specialisation', data.specialisationName)
  addRow('Section', data.sectionName)
  y += 4

  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('FEE DETAILS', margin, y)
  y += 4
  doc.line(margin, y, pageWidth - margin, y)
  y += 8
  doc.setFontSize(10)

  addRow('Semester', data.semesterName)
  addRow('Fee Amount', 'Rs. ' + Number(data.feeAmount || 0).toFixed(2))
  addRow('Payment Mode', 'Offline')
  addRow('Status', 'APPROVED')
  y += 4

  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('APPROVED BY', margin, y)
  y += 4
  doc.line(margin, y, pageWidth - margin, y)
  y += 8
  doc.setFontSize(10)

  addRow('Approved By', data.approvedByName)
  addRow('Designation', data.approvedByRole === 'teacher' ? 'Teacher' : 'CR')
  y += 8

  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text('This is a system-generated receipt.', pageWidth / 2, y, { align: 'center' })
  y += 5
  doc.text('For queries contact: fees@ltsu.edu.in', pageWidth / 2, y, { align: 'center' })

  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.text('LTSU Fee Management System | Page 1 of 1', pageWidth / 2, pageHeight - 10, { align: 'center' })

  return doc
}
