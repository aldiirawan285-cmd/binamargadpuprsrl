import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (active) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Ditunda agar tidak memanggil Supabase di dalam callback auth (menghindari deadlock)
        setTimeout(() => void loadProfile(s?.user.id), 0)
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}

/** Role user aktif (null bila menunggu persetujuan / nonaktif) */
export function useRole() {
  const { profile } = useAuth()
  return profile?.is_active ? profile.role : null
}
