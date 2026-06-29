'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Portal para músicos sin token de invitación — redirige al token cuando exista
export default function PortalMemberPage() {
  const { id } = useParams<{ id: string }>()

  useEffect(() => {
    async function findToken() {
      const { data: inv } = await supabase
        .from('invitations')
        .select('token')
        .eq('member_id', id)
        .order('created_at', { ascending: false })
        .limit(1).single()
      if (inv) {
        window.location.href = `/portal/${inv.token}`
      }
    }
    findToken()
    // Poll cada 5s por si llega una invitación
    const interval = setInterval(findToken, 5000)
    return () => clearInterval(interval)
  }, [id])

  return (
    <div style={{minHeight:'100vh',background:'#F5F0E6',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Helvetica Neue",Helvetica,Arial,sans-serif'}}>
      <div style={{background:'white',borderRadius:16,padding:32,textAlign:'center',maxWidth:320,border:'0.5px solid #E0D8C8'}}>
        <div style={{fontFamily:'"Dancing Script",cursive',fontWeight:700,fontSize:36,color:'#1A1A1A',marginBottom:16}}>Áncora</div>
        <p style={{fontSize:14,fontWeight:500,color:'#1A1A1A',marginBottom:8}}>¡Bienvenido al equipo!</p>
        <p style={{fontSize:13,color:'#999',fontWeight:300}}>
          Tu portal estará disponible cuando el administrador te asigne a un servicio.
        </p>
      </div>
    </div>
  )
}
