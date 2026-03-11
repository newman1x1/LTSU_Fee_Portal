const badgeStyles = {
  pending: 'badge badge-pending',
  approved: 'badge badge-approved',
  rejected: 'badge badge-rejected',
}

export default function Badge({ status }) {
  return (
    <span className={badgeStyles[status] || 'badge'}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : ''}
    </span>
  )
}
