export default function GlassCard({ children, className = '', hover = true, ...props }) {
  const { style: inlineStyle, ...rest } = props
  return (
    <div
      className={`glass-card ${hover ? '' : 'no-hover'} ${className}`}
      style={{ padding: 24, ...inlineStyle }}
      {...rest}
    >
      {children}
    </div>
  )
}
