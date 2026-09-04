'use client'
import { useState } from 'react'
import Link from 'next/link'
import client from '@/lib/client.js'

export default function ForgotPasswordPage () {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit (event) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const { data } = await client.post('/auth/forgot-password', { email })
      setMessage(data.message)
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || 'Unable to create a reset link.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className='auth-card'>
      <div className='auth-kicker'>Account recovery</div>
      <h1>Reset password</h1>
      <p className='auth-description'>
        Enter your email and we&apos;ll create a one-hour reset link.
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
            onChange={event => setEmail(event.target.value)}
          />
        </label>
        {error && (
          <p className='form-error' role='alert'>
            {error}
          </p>
        )}
        {message && (
          <p className='form-success' role='status'>
            {message}
          </p>
        )}
        <button type='submit' className='auth-submit' disabled={loading}>
          {loading ? 'Creating link…' : 'Create reset link'}
        </button>
      </form>
      <p className='auth-switch'>
        <Link href='/login'>Back to sign in</Link>
      </p>
    </section>
  )
}