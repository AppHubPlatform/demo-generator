export const metadata = {
  title: 'Browser Automation GUI',
  description: 'GUI for running browser automation scripts',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
