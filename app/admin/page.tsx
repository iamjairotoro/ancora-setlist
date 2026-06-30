'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock } from '@/lib/types'
import TeamPanel from '@/components/TeamPanel'
import SongsPanel from '@/components/SongsPanel'
import AdminServiceView from '@/components/AdminServiceView'
import AvailabilityPanel from '@/components/AvailabilityPanel'
import AdminsPanel from '@/components/AdminsPanel'
import TexBg from '@/components/TexBg'

const POSICIONES_BANDA = ['AG1','AG2','EG','KEYS','BASS','DRUMS','MD'] as const
const POSICIONES_VX    = ['VX1','VX2','VX3','VX4'] as const
const POSICIONES_TECNICA = ['SONIDO1','SONIDO2','MONTAJE1','MONTAJE2','MONTAJE3','MONTAJE4'] as const
const LABEL_TECNICA: Record<string,string> = {
  SONIDO1:'SONIDO 1', SONIDO2:'SONIDO 2',
  MONTAJE1:'MONTAJE 1', MONTAJE2:'MONTAJE 2',
  MONTAJE3:'MONTAJE 3', MONTAJE4:'MONTAJE 4',
}
const INSTR_POR_POSICION: Record<string,string[]> = {
  AG1:['Guitarra Acustica'],AG2:['Guitarra Acustica'],EG:['Guitarra Electrica'],
  KEYS:['Piano'],BASS:['Bajo'],DRUMS:['Bateria'],
  MD:['MD (Direccion Musical en vivo)'],
  SONIDO1:['Sonido'],SONIDO2:['Sonido'],
  MONTAJE1:['Montaje'],MONTAJE2:['Montaje'],MONTAJE3:['Montaje'],MONTAJE4:['Montaje'],
  VX1:['Voz'],VX2:['Voz'],VX3:['Voz'],VX4:['Voz'],
}

type Tab = 'setlist'|'equipo'|'canciones'|'disponibilidad'|'ajustes'

export default function AdminPage() {
  const [authed, setAuthed]   = useState(false)
  const [tab, setTab]         = useState<Tab>('setlist')
  const [portalToken, setPortalToken] = useState<string|null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [services, setServices]             = useState<Service[]>([])
  const [members, setMembers]               = useState<Member[]>([])
  const [songs, setSongs]                   = useState<Song[]>([])
  const [selectedService, setSelectedService] = useState<Service|null>(null)
  const [blocks, setBlocks]                 = useState<ServiceBlock[]>([])
  const [bandaItems, setBandaItems]         = useState<BandaAssignment[]>([])
  const [invitations, setInvitations]       = useState<Invitation[]>([])
  const [sending, setSending]               = useState(false)
  const [msg, setMsg]                       = useState('')

  useEffect(()=>{
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      const { data } = await supabase.from('admin_emails').select('email').eq('email', session.user.email!).single()
      if (data) {
        setAuthed(true)
        const email = session.user.email!
        const { data: member } = await supabase.from('members').select('id').eq('email', email).single()
        if (member) {
          const { data: inv } = await supabase.from('invitations').select('token').eq('member_id', member.id).order('created_at', { ascending: false }).limit(1).single()
          if (inv) setPortalToken(inv.token)
        }
      } else window.location.href = '/login'
    })
  },[])

  const loadServices = useCallback(async () => {
    const { data } = await supabase.from('services').select('*').order('fecha',{ascending:true})
    setServices(data||[])
    if(!selectedService && data?.length) {
      const now = new Date()
      const next = data.find(s => new Date(s.hora_fin ? s.fecha+'T'+s.hora_fin : s.fecha+'T14:00:00') > now)
      setSelectedService(next || data[0])
    }
  },[selectedService])

  const loadMembers = useCallback(async()=>{ const{data}=await supabase.from('members').select('*').order('nombre'); setMembers(data||[]) },[])
  const loadSongs   = useCallback(async()=>{ const{data}=await supabase.from('songs').select('*').order('nombre'); setSongs(data||[]) },[])

  const loadService = useCallback(async(svc: Service)=>{
    const [bl, ba, inv] = await Promise.all([
      fetch(`/api/service-blocks?serviceId=${svc.id}`).then(r=>r.json()),
      supabase.from('banda_assignments').select('*,member:members(*)').eq('service_id',svc.id),
      supabase.from('invitations').select('*,member:members(*)').eq('service_id',svc.id),
    ])
    setBlocks(bl.blocks||[])
    setBandaItems(ba.data||[])
    setInvitations(inv.data||[])
  },[])

  useEffect(()=>{ if(authed){ loadServices(); loadMembers(); loadSongs() }},[authed])
  useEffect(()=>{ if(selectedService) loadService(selectedService) },[selectedService])

  async function createService(fecha: string, horaInicio?: string, horaFin?: string) {
    const d = new Date(fecha+'T12:00:00')
    const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const titulo=`Servicio Ancora — ${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
    const{data}=await supabase.from('services').insert({
      fecha, titulo,
      hora_inicio: horaInicio||'10:00',
      hora_fin: horaFin||'14:00',
    }).select().single()
    if(data){ await loadServices(); setSelectedService(data) }
  }

  async function deleteService(id: string) {
    if(!confirm('¿Eliminar este servicio?')) return
    await fetch('/api/delete-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:id})})
    setSelectedService(null); await loadServices()
  }

  async function duplicateService(id: string, newFecha: string) {
    const res=await fetch('/api/duplicate-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:id,newFecha})})
    const data=await res.json(); await loadServices()
    const{data:newSvc}=await supabase.from('services').select('*').eq('id',data.serviceId).single()
    if(newSvc) setSelectedService(newSvc)
  }

  async function assignBanda(posicion: string, memberId: string) {
    if(!selectedService) return
    await supabase.from('banda_assignments').upsert(
      {service_id:selectedService.id,posicion,member_id:memberId||null},
      {onConflict:'service_id,posicion'}
    )
    loadService(selectedService)
  }

  async function sendInvites() {
    if(!selectedService) return
    setSending(true); setMsg('')
    try {
      const res=await fetch('/api/send-invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:selectedService.id})})
      const data=await res.json(); setMsg(data.message||'Enviadas ✓'); loadService(selectedService)
    } catch { setMsg('Error al enviar.') }
    finally { setSending(false) }
  }

  function membersFor(posicion: string) {
    const allowed=INSTR_POR_POSICION[posicion]||[]
    return members.filter(m=>m.instrumentos.some(i=>allowed.includes(i)))
  }
  function getBanda(pos: string){ return bandaItems.find(b=>b.posicion===pos) }

  if(!authed) return (
    <TexBg className="min-h-screen flex items-center justify-center">
      <div style={{textAlign:'center'}}>
        <div style={{width:36,height:36,border:'2px solid #F5F0E6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
        <p style={{color:'rgba(245,240,230,0.5)',fontSize:13,fontWeight:300}}>Verificando acceso...</p>
      </div>
    </TexBg>
  )

  return (
    <div style={{minHeight:'100vh',background:'#F5F0E6',fontFamily:'"Helvetica Neue",Helvetica,Arial,sans-serif'}}>

      {/* ── NAVBAR ── */}
      <div className="z-30 shadow-lg" style={{
        position:'sticky', top:0,
        backgroundImage:'url(/bg-ancora.jpg)',
        backgroundSize:'cover',
        backgroundPosition:'center',
      }}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}/>
        <header style={{position:'relative',height:56,display:'flex',alignItems:'center',padding:'0 16px',justifyContent:'space-between'}}>
          {/* Logo — sin caja */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{fontFamily:'"Dancing Script",cursive',fontWeight:700,fontSize:22,color:'#F5F0E6',lineHeight:1}}>Áncora</div>
            <div style={{width:24,height:0.5,background:'rgba(245,240,230,0.4)',margin:'2px 0'}}/>
            <div style={{fontFamily:'"Helvetica Neue",Helvetica,sans-serif',fontWeight:400,fontSize:7,letterSpacing:4,textTransform:'uppercase' as const,color:'rgba(245,240,230,0.85)'}}>Worship</div>
          </div>

          {/* Desktop nav */}
          <div className="hidden-mobile" style={{display:'flex',alignItems:'center',gap:2}}>
            {(['setlist','equipo','canciones','disponibilidad','ajustes'] as Tab[]).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{fontSize:12,padding:'6px 14px',borderRadius:20,fontWeight:tab===t?700:400,background:tab===t?'rgba(245,240,230,0.2)':'transparent',color:tab===t?'#F5F0E6':'rgba(245,240,230,0.55)',border:tab===t?'0.5px solid rgba(245,240,230,0.3)':'0.5px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>
                {t==='setlist'?'Servicio':t==='equipo'?'Equipo':t==='canciones'?'Canciones':t==='disponibilidad'?'Disponibilidad':'Ajustes'}
              </button>
            ))}
            <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:8}}>
              {portalToken && (
                <a href={`/portal/${portalToken}`} target="_blank"
                  style={{fontSize:9,background:'rgba(245,240,230,0.1)',border:'0.5px solid rgba(245,240,230,0.22)',color:'#F5F0E6',padding:'3px 9px',borderRadius:20,textDecoration:'none',fontWeight:500}}>
                  👤 Mi portal
                </a>
              )}
              <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
                style={{fontSize:10,color:'rgba(245,240,230,0.4)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                Salir
              </button>
            </div>
          </div>

          {/* Mobile right: tab label + Portal + Hamburger */}
          <div className="show-mobile" style={{display:'none',alignItems:'center',gap:8}}>
            {/* Tab activo visible en navbar */}
            <span style={{fontSize:11,fontWeight:600,color:'rgba(245,240,230,0.7)',letterSpacing:0.5}}>
              {tab==='setlist'?'Servicio':tab==='equipo'?'Equipo':tab==='canciones'?'Canciones':tab==='disponibilidad'?'Disponibilidad':'Ajustes'}
            </span>
            {portalToken && (
              <a href={`/portal/${portalToken}`} target="_blank"
                style={{fontSize:9,background:'rgba(245,240,230,0.12)',border:'0.5px solid rgba(245,240,230,0.25)',color:'#F5F0E6',padding:'4px 10px',borderRadius:20,textDecoration:'none',fontWeight:500}}>
                👤 Portal
              </a>
            )}
            <button onClick={()=>setMobileMenuOpen(v=>!v)}
              style={{display:'flex',flexDirection:'column',gap:5,background:'none',border:'none',cursor:'pointer',padding:4}}>
              <span style={{width:22,height:2,background:'rgba(245,240,230,0.8)',borderRadius:2,display:'block'}}/>
              <span style={{width:22,height:2,background:'rgba(245,240,230,0.8)',borderRadius:2,display:'block'}}/>
              <span style={{width:22,height:2,background:'rgba(245,240,230,0.8)',borderRadius:2,display:'block'}}/>
            </button>
          </div>
        </header>

      </div>

      {/* Dropdown — fixed para evitar overflow:hidden del navbar */}
      {mobileMenuOpen&&(
        <div style={{position:'fixed',top:56,right:0,zIndex:100,width:240}}>
          <div onClick={()=>setMobileMenuOpen(false)}
            style={{position:'fixed',inset:0,zIndex:98,background:'transparent'}}/>
          <div style={{position:'relative',zIndex:99,background:'#1A1A1A',padding:'8px 0',boxShadow:'0 8px 24px rgba(0,0,0,0.5)',borderRadius:'0 0 0 12px'}}>
            {(['setlist','equipo','canciones','disponibilidad','ajustes'] as Tab[]).map(t=>(
              <button key={t} onClick={()=>{setTab(t);setMobileMenuOpen(false)}}
                style={{width:'100%',textAlign:'left',padding:'14px 20px',fontSize:15,fontWeight:tab===t?700:400,background:tab===t?'rgba(245,240,230,0.1)':'none',color:tab===t?'#F5F0E6':'rgba(245,240,230,0.65)',border:'none',cursor:'pointer',fontFamily:'inherit',borderLeft:tab===t?'3px solid #C9A14A':'3px solid transparent'}}>
                {t==='setlist'?'🗓 Servicio':t==='equipo'?'👥 Equipo':t==='canciones'?'🎵 Canciones':t==='disponibilidad'?'📅 Disponibilidad':'⚙️ Ajustes'}
              </button>
            ))}
            <div style={{borderTop:'0.5px solid rgba(245,240,230,0.1)',margin:'6px 0'}}/>
            <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login'; setMobileMenuOpen(false) }}
              style={{width:'100%',textAlign:'left',padding:'14px 20px',fontSize:15,color:'rgba(245,240,230,0.35)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              Salir
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'16px',paddingBottom:32}}>
        {tab==='setlist' && (
          <AdminServiceView
            services={services} selectedService={selectedService}
            setSelectedService={setSelectedService} createService={createService}
            deleteService={deleteService} duplicateService={duplicateService}
            members={members} songs={songs} blocks={blocks}
            bandaItems={bandaItems} invitations={invitations}
            membersFor={membersFor} getBanda={getBanda}
            assignBanda={assignBanda}
            sendInvites={sendInvites} sending={sending} msg={msg}
            onBlocksChange={()=>selectedService&&loadService(selectedService)}
            POSICIONES_BANDA={POSICIONES_BANDA} POSICIONES_VX={POSICIONES_VX}
            POSICIONES_TECNICA={POSICIONES_TECNICA} LABEL_TECNICA={LABEL_TECNICA}
          />
        )}
        {tab==='equipo'       && <TeamPanel members={members} onRefresh={loadMembers} />}
        {tab==='canciones'        && <SongsPanel songs={songs} onRefresh={loadSongs} />}
        {tab==='disponibilidad'   && <AvailabilityPanel services={services} />}
        {tab==='ajustes'          && <AdminsPanel />}
      </div>
    </div>
  )
}
