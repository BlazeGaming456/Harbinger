'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useAuth } from '@/context/AuthContext'
import client from '@/lib/client'
import GoogleMark from '@/components/GoogleMark.jsx'

export default function SignupPage () {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  async function handleSubmit (e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await client.post('/auth/signup', { email, password })
      await login(email, password)
      router.push('/dashboard')
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || 'Could not create your account.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignUp () {
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <section className='auth-card'>
      <div className='auth-kicker'>Get started</div>
      <h1>Create account</h1>
      <p className='auth-description'>
        Monitor your first endpoint in under a minute.
      </p>
      <form onSubmit={handleSubmit} className='auth-form'>
        <label className='label'>
          Email
          <input
            required
            type='email'
            className='input'
            placeholder='you@example.com'
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>
        <label className='label'>
          Password
          <input
            required
            minLength={8}
            type='password'
            className='input'
            placeholder='At least 8 characters'
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className='form-error' role='alert'>
            {error}
          </p>
        )}
        <button type='submit' className='auth-submit' disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <div className='auth-divider'>
        <span>or</span>
      </div>
      <button
        type='button'
        className='oauth-button'
        onClick={handleGoogleSignUp}
      >
        <GoogleMark />
        <span>Continue with Google</span>
      </button>
      <p className='auth-switch'>
        Already have an account? <Link href='/login'>Sign in</Link>
      </p>
    </section>
  )
}
