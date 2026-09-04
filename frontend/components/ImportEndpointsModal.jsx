'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Upload, X } from 'lucide-react'
import client from '@/lib/client.js'

function parseCsv (text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]
    if (character === '"' && quoted && next === '"') {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value.trim())
      value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1
      row.push(value.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }

  row.push(value.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function readEndpoints (file) {
  return file.text().then(text => {
    const rows = parseCsv(text)
    if (rows.length < 2)
      throw new Error(
        'CSV must include a header row and at least one endpoint.'
      )

    const headers = rows[0].map(header => header.toLowerCase().trim())
    const urlIndex = headers.indexOf('url')
    const nameIndex = headers.indexOf('name')
    const intervalIndex = headers.indexOf('interval_seconds')
    if (urlIndex === -1 || intervalIndex === -1) {
      throw new Error(
        'CSV must include url and interval_seconds columns. name is optional.'
      )
    }

    return rows.slice(1).map((row, index) => {
      const url = row[urlIndex]
      const interval = Number(row[intervalIndex])
      if (
        !url ||
        !Number.isInteger(interval) ||
        interval < 10 ||
        interval > 86400
      ) {
        throw new Error(
          `Row ${
            index + 2
          }: provide a valid URL and interval_seconds between 10 and 86400.`
        )
      }
      return {
        url,
        name: nameIndex === -1 ? undefined : row[nameIndex] || undefined,
        interval_seconds: interval
      }
    })
  })
}

export default function ImportEndpointsModal ({ open, onClose, onCreated }) {
  const [fileName, setFileName] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleFile (event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setFileName(file.name)
    try {
      const parsed = await readEndpoints(file)
      if (parsed.length > 100)
        throw new Error('You can import a maximum of 100 endpoints at once.')
      setItems(parsed)
    } catch (parseError) {
      setItems([])
      setError(parseError.message)
    }
  }

  async function handleImport (event) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await client.post('/endpoints/bulk', { endpoints: items })
      onCreated()
      handleClose()
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || 'Could not import endpoints.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleClose () {
    if (loading) return
    setFileName('')
    setItems([])
    setError(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className='modal-overlay'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className='modal'
            role='dialog'
            aria-modal='true'
            aria-labelledby='import-endpoints-title'
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            onClick={event => event.stopPropagation()}
          >
            <div className='modal-header'>
              <h2 id='import-endpoints-title' className='modal-title'>
                Import endpoints
              </h2>
              <button
                type='button'
                className='btn-icon-ghost'
                onClick={handleClose}
                aria-label='Close'
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleImport} className='modal-form'>
              <p className='page-desc' style={{ margin: 0 }}>
                Choose a CSV with <strong>url</strong>,{' '}
                <strong>interval_seconds</strong>, and optionally{' '}
                <strong>name</strong>.
              </p>
              <label className='csv-dropzone'>
                <Upload size={20} />
                <span>{fileName || 'Choose CSV file'}</span>
                <input
                  type='file'
                  accept='.csv,text/csv'
                  onChange={handleFile}
                />
              </label>
              {items.length > 0 && (
                <p className='form-success' role='status'>
                  Ready to import {items.length} endpoint
                  {items.length === 1 ? '' : 's'}.
                </p>
              )}
              {error && (
                <p className='form-error' role='alert'>
                  {error}
                </p>
              )}
              <button
                type='submit'
                disabled={loading || items.length === 0}
                className='btn btn-primary'
                style={{ width: '100%' }}
              >
                {loading ? 'Importing…' : 'Import endpoints'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
