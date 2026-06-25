'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock } from '@/lib/types'
import TeamPanel from '@/components/TeamPanel'
import SongsPanel from '@/components/SongsPanel'
import StatsPanel from '@/components/StatsPanel'
import AdminServiceView from '@/components/AdminServiceView'

const POSICIONES_BANDA = ['AG1','AG2','EG','KEYS','BASS','DRUMS','MD','SONIDO'] as const
const POSICIONES_VX    = ['VX1','VX2','VX3','VX4'] as const
const INSTR_POR_POSICION: Record<string,string[]> = {
  AG1:['Guitarra Acustica'],AG2:['Guitarra Acustica'],EG:['Guitarra Electrica'],
  KEYS:['Keys','Piano'],BASS:['Bajo'],DRUMS:['Bateria'],
  MD:['MD (Direccion Musical en vivo)'],SONIDO:['Sonido'],
  VX1:['Voz'],VX2:['Voz'],VX3:['Voz'],VX4:['Voz'],
}

type Tab = 'setlist'|'equipo'|'canciones'|'estadisticas'

export default function AdminPage() {
  const [authed, setAuthed]   = useState(false)
  const [pw, setPw]           = useState('')
  const [pwError, setPwError] = useState(false)
  const [tab, setTab]         = useState<Tab>('setlist')

  const [services, setServices]             = useState<Service[]>([])
  const [members, setMembers]               = useState<Member[]>([])
  const [songs, setSongs]                   = useState<Song[]>([])
  const [selectedService, setSelectedService] = useState<Service|null>(null)
  const [blocks, setBlocks]                 = useState<ServiceBlock[]>([])
  const [bandaItems, setBandaItems]         = useState<BandaAssignment[]>([])
  const [invitations, setInvitations]       = useState<Invitation[]>([])
  const [sending, setSending]               = useState(false)
  const [msg, setMsg]                       = useState('')

  function login() {
    if (pw === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'ancora2024')) {
      setAuthed(true); sessionStorage.setItem('ancora_auth','1')
    } else { setPwError(true); setTimeout(()=>setPwError(false),2000) }
  }
  useEffect(()=>{ if(sessionStorage.getItem('ancora_auth')) setAuthed(true) },[])

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
    <div className="min-h-screen bg-gradient-to-br from-[#1F2A44] to-[#2E3D5C] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1F2A44] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-[#C9A14A] font-black text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-black text-[#1F2A44]">Ancora</h1>
          <p className="text-gray-400 text-sm mt-1">Panel de administración</p>
        </div>
        <input type="password" placeholder="Contraseña"
          className={`input mb-3 ${pwError?'border-red-400':''}`}
          value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&login()} />
        {pwError && <p className="text-red-500 text-xs mb-2 text-center">Contraseña incorrecta</p>}
        <button onClick={login} className="btn-primary w-full py-3 text-base">Entrar</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-[#1F2A44] text-white h-14 flex items-center px-5 justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#C9A14A] rounded-lg flex items-center justify-center font-black text-[#1F2A44] text-sm">A</div>
          <span className="font-bold text-base">Ancora Setlist</span>
        </div>
        <div className="flex items-center gap-1">
          {([['setlist','🎵','Setlist'],['equipo','👥','Equipo'],['canciones','🎶','Canciones'],['estadisticas','📊','Stats']] as [Tab,string,string][]).map(([t,icon,label])=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab===t?'bg-white/20 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}>
              <span className="hidden sm:inline">{icon} </span>{label}
            </button>
          ))}
          <button onClick={()=>{sessionStorage.clear();setAuthed(false)}} className="ml-2 text-white/40 hover:text-white text-xs">Salir</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5">
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
        {tab==='estadisticas' && <StatsPanel members={members} />}
      </div>
    </div>
  )
}
