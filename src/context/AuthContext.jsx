import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  const fetchProfile = useCallback(async (userId) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        return
      }

      if (profileData) {
        setProfile(profileData)

        const { data: sectionData, error: sectionError } = await supabase
          .from('user_sections')
          .select('section_id, sections(id, name, branch_id, specialisation_id, semester_id, semesters(id, name, number), branches(name), specialisations(name))')
          .eq('user_id', userId)

        if (sectionError) {
          console.error('Error fetching sections:', sectionError)
        }

        setSections(sectionData?.map(s => s.sections) || [])
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      fetchingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error)
        setLoading(false)
        return
      }
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setSections([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSections([])
  }, [])

  const value = useMemo(() => ({
    user, profile, sections, loading, login, logout,
  }), [user, profile, sections, loading, login, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
