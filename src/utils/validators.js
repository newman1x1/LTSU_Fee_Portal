export const isValidEmail = (email) => {
  if (!email || email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const sanitizeText = (text) => {
  if (!text) return ''
  let clean = text.replace(/<[^>]*>/g, '').trim()
  // Strip CSV injection chars from start AND dangerous chars throughout
  clean = clean.replace(/^[=+\-@\t\r]+/, '')
  clean = clean.replace(/[\t\r]/g, ' ')
  return clean.substring(0, 500)
}

export const sanitizeRollNumber = (roll) => {
  if (!roll) return ''
  return roll.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}
