import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

const AuthContext = createContext()

export const useAuth = () => {
  return useContext(AuthContext)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [credits, setCredits] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      
      // Set initial credits
      const storedCredits = localStorage.getItem('anonymousCredits')
      setCredits(session?.user ? null : (storedCredits ? parseInt(storedCredits) : 1))
    }
    
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        // Only show success toast on new sign-ins
        if (event === 'SIGNED_IN' && !localStorage.getItem('userSession')) {
          toast.success('Successfully signed in!')
          localStorage.setItem('userSession', 'true')
        }
        // Clear anonymous credits when user logs in
        localStorage.removeItem('anonymousCredits')
        setCredits(null) // Logged in users don't use credits
      } else {
        // Clear user session on sign out
        localStorage.removeItem('userSession')
        // Set initial credit for anonymous users
        if (!localStorage.getItem('anonymousCredits')) {
          localStorage.setItem('anonymousCredits', '1')
          setCredits(1)
        }
      }
    })

    setLoading(false)
    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const useCredit = () => {
    if (user) return true // Logged in users don't use credits
    if (credits > 0) {
      const newCredits = credits - 1
      setCredits(newCredits)
      localStorage.setItem('anonymousCredits', newCredits.toString())
      return true
    }
    return false
  }

  const value = {
    user,
    credits,
    loading,
    signInWithGoogle,
    signOut,
    useCredit
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}