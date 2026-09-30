import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { http, tokenStore, unwrap } from '../api/client'
import type { AuthResult, User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAuthed: boolean
  isAdmin: boolean
  setSession: (auth: AuthResult) => void
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshUser() {
    if (!tokenStore.access) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await unwrap<User>(http.get('/auth/me'))
      setUser(me)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  function setSession(auth: AuthResult) {
    tokenStore.set(auth.accessToken, auth.refreshToken)
    setUser(auth.user)
  }

  async function logout() {
    try {
      if (tokenStore.refresh) await http.post('/auth/logout', { refreshToken: tokenStore.refresh })
    } catch {
      /* ignore */
    }
    tokenStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthed: !!user,
        isAdmin: !!user?.roles?.includes('Admin'),
        setSession,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
