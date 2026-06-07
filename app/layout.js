import './globals.css'

export const metadata = {
  title: 'Παραστατικά',
  description: 'Διαχείριση τιμολογίων',
}

export default function RootLayout({ children }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  )
}
