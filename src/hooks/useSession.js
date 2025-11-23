import { useCallback, useEffect, useState } from 'react'
import { readSession, clearSession as clearPersistedSession } from '../lib/session'

const useSession = () => {
  const [session, setSession] = useState(() => readSession())

  useEffect(() => {
    setSession(readSession())
  }, [])

  const updateSession = useCallback((nextSession) => {
    setSession(nextSession)
  }, [])

  const clearSession = useCallback(() => {
    clearPersistedSession()
    setSession(null)
  }, [])

  return {
    session,
    setSession: updateSession,
    clearSession
  }
}

export default useSession
