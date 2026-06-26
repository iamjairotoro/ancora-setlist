'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('error') === 'not-member') {
      setError('Tu cuenta de Google no está registrada en el equipo. Contacta al administrador.')
    }
  }, [searchParams])

  async function loginWithGoogle() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F2A44] to-[#2E3D5C] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1F2A44] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-[#C9A14A] font-black text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-black text-[#1F2A44]">Ancora Worship</h1>
          <p className="text-gray-400 text-sm mt-1">Inicia sesión para continuar</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl mb-4">
            {error}
          </div>
        )}

        <button onClick={loginWithGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-50">
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-6">
          Solo miembros del equipo Ancora pueden acceder.
        </p>
      </div>
    </div>
  )
}
