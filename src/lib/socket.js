import { io } from 'socket.io-client'
import { readSession } from './session'

const trimTrailingSlashes = (value) => String(value || '').replace(/\/+$/, '')

const resolveBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return trimTrailingSlashes(window.__API_BASE_URL__)
  }
  const envValue = import.meta?.env?.VITE_API_BASE_URL
  if (envValue && envValue.trim()) {
    console.log('🔌 Socket using VITE_API_BASE_URL:', envValue)
    return trimTrailingSlashes(envValue)
  }
  if (typeof window !== 'undefined' && window.location) {
    const { protocol = 'http:', hostname = 'localhost', port = '' } = window.location
    console.log('⚠️ Socket: No VITE_API_BASE_URL, using window.location')
    return trimTrailingSlashes(`${protocol}//${hostname}${port ? `:${port}` : ''}`)
  }
  return 'http://localhost:3000'
}

let socket = null

const ensureLatestAuth = (s) => {
  try {
    const session = readSession()
    // socket.io-client v4 allows updating auth before connect/reconnect
    s.auth = session?.token ? { token: session.token } : undefined
  } catch { }
}

const getSocket = () => {
  if (socket) return socket
  const baseUrl = resolveBaseUrl()
  const session = readSession()
  socket = io(baseUrl, {
    autoConnect: false,
    // Allow websocket first, but fallback to polling in restricted networks
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    auth: session?.token ? { token: session.token } : undefined,
    withCredentials: true
  })
  return socket
}

const connectSocket = () => {
  const s = getSocket()
  // Always refresh auth in case user just logged in or token changed
  ensureLatestAuth(s)
  if (!s.connected) s.connect()
  return s
}

const disconnectSocket = () => {
  if (socket && socket.connected) socket.disconnect()
}

export { getSocket, connectSocket, disconnectSocket }
