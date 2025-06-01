import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: '照片直播 - Picture Live',
    template: '%s | Picture Live'
  },
  description: '专为摄影师设计的实时照片分享平台，让每一个精彩瞬间都能即时传达',
  keywords: ['摄影', '照片直播', '实时分享', '摄影师', '活动摄影'],
  authors: [{ name: 'Picture Live Team' }],
  creator: 'Picture Live',
  publisher: 'Picture Live',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    title: '照片直播 - Picture Live',
    description: '专为摄影师设计的实时照片分享平台',
    siteName: 'Picture Live',
  },
  twitter: {
    card: 'summary_large_image',
    title: '照片直播 - Picture Live',
    description: '专为摄影师设计的实时照片分享平台',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}