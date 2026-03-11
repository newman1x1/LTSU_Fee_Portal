export default function PageWrapper({ children, maxWidth = 1200, className = '' }) {
  return (
    <main
      id="main-content"
      className={`fade-in ${className}`}
      style={{
        maxWidth,
        margin: '0 auto',
        padding: '80px 24px 40px',
        paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
        minHeight: '100vh',
      }}
    >
      {children}
    </main>
  )
}
