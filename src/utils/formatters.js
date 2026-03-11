export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export const formatActionType = (type) => {
  const map = {
    student_submitted: 'Fee request submitted',
    request_approved: 'Fee request approved',
    request_rejected: 'Fee request rejected',
    receipt_sent: 'Receipt email sent',
    rejection_email_sent: 'Rejection email sent',
    admin_created_branch: 'Branch created',
    admin_created_specialisation: 'Specialisation created',
    admin_created_section: 'Section created',
    admin_created_batch: 'Batch year created',
    admin_created_semester: 'Semester created',
    admin_created_cr: 'CR account created',
    admin_created_teacher: 'Teacher account created',
    admin_uploaded_students: 'Students uploaded',
    admin_reset_password: 'Password reset',
    admin_updated_branch: 'Branch updated',
    admin_toggled_branch: 'Branch toggled',
    admin_updated_specialisation: 'Specialisation updated',
    admin_toggled_specialisation: 'Specialisation toggled',
    admin_updated_section: 'Section updated',
    admin_toggled_section: 'Section toggled',
    admin_updated_batch: 'Batch updated',
    admin_toggled_batch: 'Batch toggled',
    admin_toggled_semester: 'Semester toggled',
    admin_toggled_staff: 'Staff account toggled',
    admin_updated_student: 'Student updated',
    admin_toggled_student: 'Student toggled',
    admin_created_student: 'Student created',
    staff_login: 'Staff login',
    staff_logout: 'Staff logout',
    admin_login: 'Admin login',
  }
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
