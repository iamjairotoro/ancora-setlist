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

      // 1. Check if admin
      const { data: adminData } = await supabase
        .from('admin_emails').select('email').eq('email', email).single()
      if (adminData) { router.push('/admin'); return }

      // 2. Check if member
      const { data: member } = await supabase
        .from('members').select('id').eq('email', email).single()

      if (member) {
        // Buscar invitación más reciente
        const { data: inv } = await supabase
          .from('invitations')
          .select('token')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })
          .limit(1).single()

        if (inv) { router.push(`/portal/${inv.token}`); return }
        // Sin invitación aún
        router.push(`/portal/member/${member.id}`); return
      }

      router.push('/login?error=not-member')
    }
    handle()
  }, [router])

  return (
    <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:32,height:32,border:'2px solid #F5F0E6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 10px'}}/>
        <p style={{color:'rgba(245,240,230,0.5)',fontSize:13}}>Verificando acceso...</p>
      </div>
    </div>
  )
}
