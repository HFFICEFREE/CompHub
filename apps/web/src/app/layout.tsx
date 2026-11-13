import localFont from 'next/font/local'
import "./globals.css";
import Layout from '@/components/Layout/Layout'

// DM Sans empacotada no repositorio (variavel, subset latin): o build nao
// depende mais de fonts.googleapis.com, que falhava/travava a CI de forma
// intermitente. Fonte e licenca (OFL-1.1) em src/app/fonts/.
const dmSans = localFont({
    src: './fonts/DMSans-Variable.woff2',
    weight: '400 700',
    style: 'normal',
    display: 'swap',
})

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000"

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "CompHub — collaborative virtual spaces",
  description:
    "Create, customize and share collaborative virtual spaces with proximity chat, video and a built-in map editor.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.className}>
      <body>
        <Layout>
            {children}
        </Layout>
      </body>
    </html>
  );
}
