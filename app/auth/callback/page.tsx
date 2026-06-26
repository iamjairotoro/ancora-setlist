'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    async function handle() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const email = session.user.email!

      // Check if admin
      const { data: adminData } = await supabase
        .from('admin_emails').select('email').eq('email', email).single()

      if (adminData) {
        router.push('/admin')
        return
      }

      // Check if member
      const { data: member } = await supabase
        .from('members').select('id').eq('email', email).single()

      if (member) {
        // Find their most recent invitation token
        const { data: inv } = await supabase
          .from('invitations')
          .select('token')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (inv) {
          router.push(`/portal/${inv.token}`)
          return
        }
      }

      // Not found — show error
      router.push('/login?error=not-member')
    }
    handle()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F2A44] to-[#2E3D5C] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#C9A14A] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-white/60 text-sm">Verificando acceso...</p>
      </div>
    </div>
  )
}
