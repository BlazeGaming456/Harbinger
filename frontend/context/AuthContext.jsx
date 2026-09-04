'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { getSession } from 'next-auth/react'
import client, { refreshAccessToken, setAccessToken } from '@/lib/client.js'

const AuthContext = createContext(null)

export function AuthProvider ({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    async function hydrateSession () {
      try {
        const token = await refreshAccessToken()
        if (token) {
          const { data } = await client.get('/users/me')
          setUser(data)
          setAuthenticated(true)
          return
        }

        const session = await getSession()
        if (!session?.user?.email) throw new Error('No valid session')

        const { data } = await client.post('/auth/google/session', {
          email: session.user.email
        })
        setAccessToken(data.accessToken)
        const { data: profile } = await client.get('/users/me')
        setUser(profile)
        setAuthenticated(true)
      } catch {
        setAccessToken(null)
        setUser(null)
        setAuthenticated(false)
        try {
          await client.post('/auth/logout')
        } catch {}
      } finally {
        // ALWAYS mark ready so pages stop showing "Restoring session..."
        setReady(true)
      }
    }

    hydrateSession()

    const handleUnauthorized = () => {
      setAccessToken(null)
      setUser(null)
      setAuthenticated(false)
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () =>
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  async function login (email, password) {
    const { data } = await client.post('/auth/login', { email, password })
    setAccessToken(data.accessToken)
    try {
      const { data: profile } = await client.get('/users/me')
      setUser(profile)
    } catch {
      setUser({ email })
    }
    setAuthenticated(true)
    setReady(true)
  }

  async function logout () {
    try {
      await client.post('/auth/logout')
    } catch {}
    setAccessToken(null)
    setUser(null)
    setAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, ready, authenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
