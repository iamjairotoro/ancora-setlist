'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service, Member, Song, SetlistItem, BandaAssignment, Invitation } from '@/lib/types'
import ServicePanel from '@/components/ServicePanel'
import TeamPanel from '@/components/TeamPanel'
import SongsPanel from '@/components/SongsPanel'

const POSICIONES_BANDA = ['AG1','AG2','EG','KEYS','BASS','DRUMS','MD','SONIDO'] as const
const POSICIONES_VX    = ['VX1','VX2','VX3','VX4'] as const

const INSTR_POR_POSICION: Record<string, string[]> = {
  AG1:    ['Guitarra Acustica'],
  AG2:    ['Guitarra Acustica'],
  EG:     ['Guitarra Electrica'],
  KEYS:   ['Keys','Piano'],
  BASS:   ['Bajo'],
  DRUMS:  ['Bateria'],
  MD:     ['MD (Direccion Musical en vivo)'],
  SONIDO: ['Sonido'],
  VX1:    ['Voz'], VX2: ['Voz'], VX3: ['Voz'], VX4: ['Voz'],
}

type Tab = 'setlist' | 'equipo' | 'canciones'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)
  const [tab, setTab] = useState<Tab>('setlist')

  const [services, setServices]       = useState<Service[]>([])
  const [members, setMembers]         = useState<Member[]>([])
  const [songs, setSongs]             = useState<Song[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [setlistItems, setSetlistItems]       = useState<SetlistItem[]>([])
  const [bandaItems, setBandaItems]           = useState<BandaAssignment[]>([])
  const [invitations, setInvitations]         = useState<Invitation[]>([])
  const [sending, setSending]                 = useState(false)
  const [msg, setMsg]                         = useState('')

  // ── Auth ──────────────────────────────────────────────────────────────────
  function login() {
    if (pw === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || pw === 'ancora2024') {
      setAuthed(true)
      sessionStorage.setItem('ancora_auth', '1')
    } else { setPwError(true); setTimeout(() => setPwError(false), 2000) }
  }
  useEffect(() => {
    if (sessionStorage.getItem('ancora_auth')) setAuthed(true)
  }, [])

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadServices = useCallback(async () => {
    const { data } = await supabase.from('services').select('*').order('fecha', { ascending: false })
    setServices(data || [])
    if (!selectedService && data?.length) setSelectedService(data[0])
  }, [selectedService])

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('members').select('*').order('nombre')
    setMembers(data || [])
  }, [])

  const loadSongs = useCallback(async () => {
    const { data } = await supabase.from('songs').select('*').order('nombre')
    setSongs(data || [])
  }, [])

  const loadService = useCallback(async (svc: Service) => {
    const [sl, ba, inv] = await Promise.all([
      supabase.from('setlist_items').select('*, song:songs(*), lead:members(*)').eq('service_id', svc.id).order('orden'),
      supabase.from('banda_assignments').select('*, member:members(*)').eq('service_id', svc.id),
      supabase.from('invitations').select('*, member:members(*)').eq('service_id', svc.id),
    ])
    setSetlistItems(sl.data || [])
    setBandaItems(ba.data || [])
    setInvitations(inv.data || [])
  }, [])

  useEffect(() => { if (authed) { loadServices(); loadMembers(); loadSongs() } }, [authed])
  useEffect(() => { if (selectedService) loadService(selectedService) }, [selectedService])

  // ── Service CRUD ──────────────────────────────────────────────────────────
  async function createService(fecha: string) {
    const d = new Date(fecha + 'T12:00:00')
    const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const titulo = `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
    const { data } = await supabase.from('services').insert({ fecha, titulo: `Servicio Ancora — ${titulo}` }).select().single()
    if (data) { await loadServices(); setSelectedService(data) }
  }

  // ── Banda assignments ─────────────────────────────────────────────────────
  async function assignBanda(posicion: string, memberId: string) {
    if (!selectedService) return
    await supabase.from('banda_assignments').upsert(
      { service_id: selectedService.id, posicion, member_id: memberId || null },
      { onConflict: 'service_id,posicion' }
    )
    loadService(selectedService)
  }

  // ── Setlist CRUD ──────────────────────────────────────────────────────────
  async function addSetlistRow() {
    if (!selectedService) return
    const next = (setlistItems.length || 0) + 1
    await supabase.from('setlist_items').insert({ service_id: selectedService.id, orden: next })
    loadService(selectedService)
  }

  async function updateSetlistItem(id: string, field: string, value: string) {
    await supabase.from('setlist_items').update({ [field]: value || null }).eq('id', id)
    loadService(selectedService!)
  }

  async function removeSetlistRow(id: string) {
    await supabase.from('setlist_items').delete().eq('id', id)
    loadService(selectedService!)
  }

  // ── Send invitations ──────────────────────────────────────────────────────
  async function sendInvites() {
    if (!selectedService) return
    setSending(true); setMsg('')
    try {
      const res = await fetch('/api/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: selectedService.id }),
      })
      const data = await res.json()
      setMsg(data.message || 'Invitaciones enviadas ✓')
      loadService(selectedService)
    } catch { setMsg('Error al enviar. Revisa la consola.') }
    finally { setSending(false) }
  }

  // ── Filter members by posicion ────────────────────────────────────────────
  function membersFor(posicion: string) {
    const allowed = INSTR_POR_POSICION[posicion] || []
    return members.filter(m => m.instrumentos.some(i => allowed.includes(i)))
  }

  function getBanda(pos: string) {
    return bandaItems.find(b => b.posicion === pos)
  }

  function statusColor(s: string) {
    if (s === 'confirmado') return 'bg-green-100 text-green-800'
    if (s === 'declinado')  return 'bg-red-100 text-red-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-navy rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-gold font-bold text-lg">A</span>
          </div>
          <h1 className="text-xl font-semibold text-navy">Ancora Setlist</h1>
          <p className="text-sm text-gray-500 mt-1">Panel de administración</p>
        </div>
        <input type="password" placeholder="Contraseña"
          className={`input mb-3 ${pwError ? 'border-red-400' : ''}`}
          value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()} />
        {pwError && <p className="text-red-500 text-xs mb-2">Contraseña incorrecta</p>}
        <button onClick={login} className="btn-primary w-full">Entrar</button>
      </div>
    </div>
  )

  // ── MAIN ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-navy text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center font-bold text-navy text-sm">A</div>
          <span className="font-semibold">Ancora Setlist</span>
        </div>
        <button onClick={() => { sessionStorage.clear(); setAuthed(false) }}
          className="text-xs text-white/60 hover:text-white">Salir</button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['setlist','equipo','canciones'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {t === 'setlist' ? '🎵 Setlist' : t === 'equipo' ? '👥 Equipo' : '🎶 Canciones'}
            </button>
          ))}
        </div>

        {/* SETLIST TAB */}
        {tab === 'setlist' && (
          <ServicePanel
            services={services}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            createService={createService}
            members={members}
            songs={songs}
            setlistItems={setlistItems}
            bandaItems={bandaItems}
            invitations={invitations}
            membersFor={membersFor}
            getBanda={getBanda}
            assignBanda={assignBanda}
            addSetlistRow={addSetlistRow}
            updateSetlistItem={updateSetlistItem}
            removeSetlistRow={removeSetlistRow}
            sendInvites={sendInvites}
            sending={sending}
            msg={msg}
            statusColor={statusColor}
            POSICIONES_BANDA={POSICIONES_BANDA}
            POSICIONES_VX={POSICIONES_VX}
          />
        )}

        {tab === 'equipo' && (
          <TeamPanel members={members} onRefresh={loadMembers} />
        )}

        {tab === 'canciones' && (
          <SongsPanel songs={songs} onRefresh={loadSongs} />
        )}
      </div>
    </div>
  )
}
