import { clearSession, readSession } from '../lib/session'

const trimTrailingSlashes = (value) => String(value).replace(/\/+$/, '')

const DEV_SERVER_PORTS = new Set(['5173', '5174', '4173', '4174'])
const FALLBACK_DEV_BACKEND_PORT = String(import.meta?.env?.VITE_API_DEV_PORT || 3000)

const resolveBaseUrl = () => {
  // Priority 1: window override
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return trimTrailingSlashes(window.__API_BASE_URL__)
  }

  // Priority 2: env variable (ALWAYS use if set)
  const envValue = import.meta?.env?.VITE_API_BASE_URL
  if (envValue && envValue.trim()) {
    console.log('[apiClient] Using VITE_API_BASE_URL:', envValue)
    return trimTrailingSlashes(envValue)
  }

  // Priority 3: fallback to localhost detection
  if (typeof window !== 'undefined' && window.location) {
    const { protocol = 'http:', hostname = 'localhost', port = '' } = window.location
    const normalizedHost = hostname || 'localhost'
    const normalizedPort = port || ''
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(normalizedHost)

    if (isLocalHost && DEV_SERVER_PORTS.has(normalizedPort)) {
      const guessedOrigin = `${protocol}//${normalizedHost}:${FALLBACK_DEV_BACKEND_PORT}`
      console.log('[apiClient] No VITE_API_BASE_URL, using localhost:', guessedOrigin)
      return trimTrailingSlashes(guessedOrigin)
    }

    const origin = `${protocol}//${normalizedHost}${normalizedPort ? `:${normalizedPort}` : ''}`
    return trimTrailingSlashes(origin)
  }

  return 'http://localhost:3000'
}

const API_BASE_URL = resolveBaseUrl()

const isAbsoluteUrl = (input) => /^https?:\/\//i.test(input)

const buildUrl = (input) => {
  if (!input) return API_BASE_URL
  if (isAbsoluteUrl(input)) return input
  if (input.startsWith('/')) {
    return `${API_BASE_URL}${input}`
  }
  return `${API_BASE_URL}/${input}`
}

const API_URL_OBJECT = (() => {
  try {
    return new URL(API_BASE_URL)
  } catch {
    return null
  }
})()

const resolveApiKey = () => {
  if (typeof window !== 'undefined') {
    const runtimeKey = window.__API_KEY__ || window.__KONG_API_KEY__
    if (runtimeKey && String(runtimeKey).trim()) {
      return String(runtimeKey).trim()
    }
  }

  const envKey = import.meta?.env?.VITE_KONG_API_KEY || import.meta?.env?.VITE_API_KEY
  if (envKey && String(envKey).trim()) {
    return String(envKey).trim()
  }

  return ''
}

const API_KEY = resolveApiKey()
if (typeof window !== 'undefined') {
  console.log('[apiClient] Base URL:', API_BASE_URL)
  console.log('[apiClient] API key present:', API_KEY ? 'yes' : 'no')
}

const shouldAttachApiKey = (targetUrl) => {
  if (!API_KEY || !API_URL_OBJECT) return false
  try {
    const parsed = new URL(targetUrl)
    return parsed.host === API_URL_OBJECT.host
  } catch {
    return false
  }
}

export const resolveAssetUrl = (input) => {
  if (!input) return ''
  if (/^data:/i.test(input)) return input
  if (isAbsoluteUrl(input)) return input
  if (input.startsWith('/')) {
    return `${API_BASE_URL}${input}`
  }
  return `${API_BASE_URL}/${input}`
}

// API Configuration
const CONFIG = {
  TIMEOUT: Number(import.meta?.env?.VITE_API_TIMEOUT_MS) || 30000,  // Default 30 seconds
  MAX_RETRIES: 5,        // Increase retries for better reliability
  RETRY_DELAY: 2000,     // 2 seconds between retries
  RETRY_STATUS_CODES: new Set([
    408,  // Request Timeout
    425,  // Too Early
    429,  // Too Many Requests
    500,  // Internal Server Error
    502,  // Bad Gateway
    503,  // Service Unavailable
    504,  // Gateway Timeout
    507,  // Insufficient Storage
    509   // Bandwidth Limit Exceeded
  ]),
  RETRY_BACKOFF: true    // Enable exponential backoff
}

// Helper functions
// Retry helpers
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const calculateBackoff = (retryCount) => {
  if (!CONFIG.RETRY_BACKOFF) return CONFIG.RETRY_DELAY
  // Exponential backoff with jitter: 2^retryCount * RETRY_DELAY + random(0-1000)ms
  return Math.min(
    (Math.pow(2, retryCount) * CONFIG.RETRY_DELAY) + Math.floor(Math.random() * 1000),
    30000 // Max 30 seconds
  )
}

const isFormData = (value) => typeof FormData !== 'undefined' && value instanceof FormData

const createTimeoutPromise = (ms) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Yeu cau het thoi gian. Vui long thu lai.')), ms)
  )

// Enhanced error class for API errors
class APIError extends Error {
  constructor(message, status, originalError = null) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.originalError = originalError
    this.retryCount = 0
  }
}

const shouldRetry = (error, retryCount) => {
  // Max retries reached
  if (retryCount >= CONFIG.MAX_RETRIES) return false

  // Always retry on network errors or CORS errors
  if (!error.status || error.name === 'TypeError') return true

  // Retry on connection refused
  if (error.message?.includes('ECONNREFUSED')) return true

  // Retry on specific status codes
  return CONFIG.RETRY_STATUS_CODES.has(error.status)
}

const getErrorMessage = (error, retryCount) => {
  // Handle authentication errors
  if (error.status === 401) {
    return 'Phien dang nhap het han. Vui long dang nhap lai.'
  }

  // Handle network/connection errors
  if (!error.status || error.name === 'TypeError') {
    return retryCount >= CONFIG.MAX_RETRIES
      ? 'Khong the ket noi den may chu. Vui long kiem tra ket noi mang va thu lai.'
      : 'Dang thu ket noi lai voi may chu...'
  }

  // Handle ECONNREFUSED
  if (error.message?.includes('ECONNREFUSED')) {
    return retryCount >= CONFIG.MAX_RETRIES
      ? 'May chu khong phan hoi. Vui long thu lai sau.'
      : 'Dang cho may chu phan hoi...'
  }

  // Handle server errors
  if (error.status >= 500) {
    return retryCount >= CONFIG.MAX_RETRIES
      ? `May chu tam thoi khong phan hoi. Da thu lai ${CONFIG.MAX_RETRIES} lan khong thanh cong.`
      : 'May chu dang gap su co, dang thu lai...'
  }

  // Handle specific error messages from server
  if (error.message) {
    return error.message
  }

  // Default error message
  return 'Co loi xay ra. Vui long thu lai sau.'
}

const apiFetch = async (input, init = {}, retryCount = 0) => {
  const url = buildUrl(input)
  const session = readSession()
  const headers = new Headers(init.headers || {})

  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `${session.tokenType || 'Bearer'} ${session.token}`)
  }

  if (API_KEY && shouldAttachApiKey(url) && !headers.has('apikey')) {
    headers.set('apikey', API_KEY)
  }

  // Ensure common headers are set
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest')
  }
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
  if (init.method === 'POST' || init.method === 'PUT' || init.method === 'PATCH') {
    if (!headers.has('Content-Type') && !isFormData(init.body)) {
      headers.set('Content-Type', 'application/json')
    }
  }

  try {
    console.log(`[apiClient] [${retryCount + 1}/${CONFIG.MAX_RETRIES + 1}] ${init.method || 'GET'} ${url}`)

    const response = await Promise.race([
      fetch(url, {
        ...init,
        headers
      }),
      createTimeoutPromise(CONFIG.TIMEOUT)
    ])

    // Log response details
    console.log('[apiClient] Response:', {
      url,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    })

    // Handle 401 immediately
    if (response.status === 401) {
      clearSession()
      throw new APIError('Phien dang nhap het han. Vui long dang nhap lai.', 401)
    }

    // If response is not ok, create an error with status
    if (!response.ok) {
      throw new APIError(
        getErrorMessage({ status: response.status }, retryCount),
        response.status
      )
    }

    return response

  } catch (error) {
    // Enhance error with retry information
    const apiError = error instanceof APIError
      ? error
      : new APIError(error.message, error.status || 0, error)
    apiError.retryCount = retryCount

    if (shouldRetry(apiError, retryCount)) {
      const backoff = calculateBackoff(retryCount)
      console.log(`[apiClient] Attempt ${retryCount + 1} failed, retrying in ${backoff}ms...`, {
        error: apiError.message,
        status: apiError.status,
        retryCount
      })
      await wait(backoff)
      return apiFetch(input, init, retryCount + 1)
    }

    // If we've exhausted retries, throw enhanced error
    apiError.message = getErrorMessage(apiError, retryCount)
    throw apiError
  }
}

export default apiFetch
