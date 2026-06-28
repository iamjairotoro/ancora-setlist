'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock } from '@/lib/types'
import TeamPanel from '@/components/TeamPanel'
import SongsPanel from '@/components/SongsPanel'
import AdminServiceView from '@/components/AdminServiceView'
import TexBg from '@/components/TexBg'

const POSICIONES_BANDA = ['AG1','AG2','EG','KEYS','BASS','DRUMS','MD','SONIDO'] as const
const POSICIONES_VX    = ['VX1','VX2','VX3','VX4'] as const
const INSTR_POR_POSICION: Record<string,string[]> = {
  AG1:['Guitarra Acustica'],AG2:['Guitarra Acustica'],EG:['Guitarra Electrica'],
  KEYS:['Keys','Piano'],BASS:['Bajo'],DRUMS:['Bateria'],
  MD:['MD (Direccion Musical en vivo)'],SONIDO:['Sonido'],
  VX1:['Voz'],VX2:['Voz'],VX3:['Voz'],VX4:['Voz'],
}

type Tab = 'setlist'|'equipo'|'canciones'

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
    const { data } = await supabase.from('services').select('*').order('fecha',{ascending:false})
    setServices(data||[])
    if(!selectedService && data?.length) setSelectedService(data[0])
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

  async function createService(fecha: string) {
    const d = new Date(fecha+'T12:00:00')
    const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const titulo=`Servicio Ancora — ${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
    const{data}=await supabase.from('services').insert({fecha,titulo}).select().single()
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
      <TexBg className="sticky top-0 z-30 shadow-lg">
        <header style={{height:56,display:'flex',alignItems:'center',padding:'0 16px',justifyContent:'space-between'}}>
          {/* Logo — fondo oscuro vertical */}
          <div style={{background:'#1A1A1A',borderRadius:10,padding:'7px 16px',display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{fontFamily:'"Dancing Script",cursive',fontWeight:700,fontSize:22,color:'#F5F0E6',lineHeight:1}}>Áncora</div>
            <div style={{width:28,height:0.5,background:'rgba(245,240,230,0.35)',margin:'3px 0'}}/>
            <div style={{fontFamily:'"Helvetica Neue",Helvetica,sans-serif',fontWeight:400,fontSize:8,letterSpacing:5,textTransform:'uppercase' as const,color:'rgba(245,240,230,0.75)'}}>Worship</div>
          </div>

          {/* Desktop nav */}
          <div className="hidden-mobile" style={{display:'flex',alignItems:'center',gap:2}}>
            {(['setlist','equipo','canciones'] as Tab[]).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{fontSize:10,padding:'4px 10px',borderRadius:20,fontWeight:tab===t?500:400,background:tab===t?'rgba(245,240,230,0.15)':'transparent',color:tab===t?'#F5F0E6':'rgba(245,240,230,0.5)',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                {t==='setlist'?'Setlist':t==='equipo'?'Equipo':'Canciones'}
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

          {/* Mobile right: Portal + Hamburger */}
          <div className="show-mobile" style={{display:'none',alignItems:'center',gap:8}}>
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

        {/* Mobile dropdown menu */}
        {mobileMenuOpen&&(
          <div style={{position:'absolute',top:'100%',right:0,left:0,background:'#1A1A1A',zIndex:50,padding:'8px 0',borderBottom:'0.5px solid rgba(245,240,230,0.1)'}}>
            {(['setlist','equipo','canciones'] as Tab[]).map(t=>(
              <button key={t} onClick={()=>{setTab(t);setMobileMenuOpen(false)}}
                style={{width:'100%',textAlign:'left',padding:'12px 20px',fontSize:14,fontWeight:tab===t?600:400,background:tab===t?'rgba(245,240,230,0.08)':'none',color:'#F5F0E6',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                {t==='setlist'?'📋 Setlist':t==='equipo'?'👥 Equipo':'🎵 Canciones'}
              </button>
            ))}
            <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
              style={{width:'100%',textAlign:'left',padding:'12px 20px',fontSize:14,color:'rgba(245,240,230,0.4)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              Salir
            </button>
          </div>
        )}
      </TexBg>

      {/* ── MOBILE TABS — pill style ── */}
      <div className="show-mobile" style={{display:'none',background:'white',borderBottom:'0.5px solid #E0D8C8',padding:'10px 14px'}}>
        <div style={{display:'flex',gap:8}}>
          {(['setlist','equipo','canciones'] as Tab[]).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{
                flex:1,padding:'7px 0',borderRadius:20,
                background:tab===t?'#1A1A1A':'transparent',
                border:`0.5px solid ${tab===t?'#1A1A1A':'#E0D8C8'}`,
                color:tab===t?'#F5F0E6':'#999',
                fontSize:12,fontWeight:tab===t?600:500,
                cursor:'pointer',fontFamily:'inherit',
              }}>
              {t==='setlist'?'Setlist':t==='equipo'?'Equipo':'Canciones'}
            </button>
          ))}
        </div>
      </div>

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
          />
        )}
        {tab==='equipo'       && <TeamPanel members={members} onRefresh={loadMembers} />}
        {tab==='canciones'    && <SongsPanel songs={songs} onRefresh={loadSongs} />}
      </div>
    </div>
  )
}
