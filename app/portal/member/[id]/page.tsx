'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirige directo al portal por member_id (sin necesitar token)
export default function PortalMemberPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    // Redirigir directo a /portal/by-member/[id]
    router.replace(`/portal/by-member/${id}`)
  }, [id, router])

  return (
    <div style={{minHeight:'100vh',background:'#FFFFFF',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'2px solid #1A1A1A',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )
}
