'use client'

import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from '@/context/AuthContext.jsx'

export default function Providers ({ children }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <AuthProvider>{children}</AuthProvider>
    </SessionProvider>
  )
}
