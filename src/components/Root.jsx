import { useState, useEffect } from 'react'
import { sb } from '../services/supabase'
import AuthScreen from './AuthScreen'
import QuitaApp from './QuitaApp'

export default function Root() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await sb.auth.signOut()
    setUser(null)
  }

  if (loading) return (
    <div style={{ background: '#F2F0F8', minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>

      <div style={{ width: 32, height: 32, border: '3px solid #EDE9FE',
        borderTop: '3px solid #7B2FF2', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!user) return <AuthScreen onAuth={setUser} />
  return <QuitaApp user={user} onSignOut={handleSignOut} />
}
