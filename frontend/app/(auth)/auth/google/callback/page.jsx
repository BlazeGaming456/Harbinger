'use client'
import { useEffect, useState } from 'react'
import { getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import client, { setAccessToken } from '@/lib/client.js'

export default function GoogleCallbackPage () {
  const [status, setStatus] = useState('Completing sign in…')
  const router = useRouter()

  useEffect(() => {
    async function completeGoogleAuth () {
      try {
        const session = await getSession()
        if (!session?.user?.email) {
          setStatus('Sign in failed. Redirecting…')
          setTimeout(() => router.push('/login'), 1500)
          return
        }

        // Exchange the NextAuth session for Fastify JWT + cookie
        const { data } = await client.post('/auth/google/session', {
          email: session.user.email
        })
        setAccessToken(data.accessToken)
        router.push('/dashboard')
      } catch {
        setStatus('Something went wrong. Redirecting to login…')
        setTimeout(() => router.push('/login'), 1500)
      }
    }

    completeGoogleAuth()
  }, [router])

  return (
    <section className='auth-card' style={{ textAlign: 'center' }}>
      <div
        className='pulse'
        style={{
          margin: '0 auto 16px',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--mint)'
        }}
      />
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>{status}</p>
    </section>
  )
}