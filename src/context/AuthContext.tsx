import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'

export const AuthContext = createContext<{user: User | null; loading: boolean; signOut: () => Promise<void>}>({user:null,loading:true,signOut:async()=>{}})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Loading…</div>
  }

  return <AuthContext.Provider value={{user,loading,signOut:logout}}>{children}</AuthContext.Provider>
}

export const useAuthListener = () => {
  const { user, loading, signOut } = useContext(AuthContext)

  return { user, loading, signOut }
}
