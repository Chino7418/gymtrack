import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    // meta = { first_name, last_name, username }: el trigger handle_new_user crea el perfil con esos campos
    signUp: (email, password, meta) =>
      supabase.auth.signUp({ email, password, options: { data: meta } }),
    signOut: () => supabase.auth.signOut(),
    forgot: (email) =>
      supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }),
    updatePassword: (password) => supabase.auth.updateUser({ password }),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
