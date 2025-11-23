const STORAGE_KEY = 'fatfoodSession'

const readSession = () => {
  if (typeof window === 'undefined') return null
  try {
    const fromSession = window.sessionStorage.getItem(STORAGE_KEY)
    if (fromSession) {
      return JSON.parse(fromSession)
    }
    const fromLocal = window.localStorage.getItem(STORAGE_KEY)
    return fromLocal ? JSON.parse(fromLocal) : null
  } catch (error) {
    console.warn('Failed to read persisted session', error)
    return null
  }
}

const persistSession = (payload, remember) => {
  if (typeof window === 'undefined') return
  try {
    const serialized = JSON.stringify(payload)
    if (remember) {
      window.localStorage.setItem(STORAGE_KEY, serialized)
      window.sessionStorage.removeItem(STORAGE_KEY)
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, serialized)
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.warn('Failed to persist session', error)
  }
}

const clearSession = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(STORAGE_KEY)
}

const getToken = () => {
  const session = readSession()
  return session?.token || null
}

const getUser = () => {
  const session = readSession()
  return session?.user || null
}

export {
  STORAGE_KEY,
  readSession,
  persistSession,
  clearSession,
  getToken,
  getUser
}
