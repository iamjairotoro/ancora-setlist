'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Song {
  id: string; nombre: string; artista: string
  tono_original?: string; bpm?: number; compas?: string
  link_spotify?: string; link_letras?: string; link_recursos?: string; notas?: string
}
interface SetlistItem { orden: number; tono?: string; song?: Song; lead?: { nombre: string } }
interface BandaItem   { posicion: string; member?: { nombre: string } }
interface ServiceData {
  service: { id: string; fecha: string; titulo: string }
  posicion: string
  invitation: { status: string; comentario?: string; token: string } | null
  setlist: SetlistItem[]
  banda: BandaItem[]
}
interface Member { nombre: string; apellido: string; email: string; telefono?: string }

const POSICIONES_ORDEN = ['AG1','AG2','EG','KEYS','BASS','DRUMS','MD','SONIDO','VX1','VX2','VX3','VX4']
const POS_ICON: Record<string,string> = {
  AG1:'🎸',AG2:'🎸',EG:'⚡',KEYS:'🎹',BASS:'🎸',DRUMS:'🥁',MD:'🎙',SONIDO:'🔊',
  VX1:'🎤',VX2:'🎤',VX3:'🎤',VX4:'🎤'
}

type Tab = 'home'|'recursos'|'perfil'

export default function PortalPage() {
  const { token } = useParams<{ token: string }>()
  const [member, setMember]     = useState<Member|null>(null)
  const [services, setServices] = useState<ServiceData[]>([])
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab]           = useState<Tab>('home')
  const [expandedSvc, setExpandedSvc] = useState<string|null>(null)
  const [editProfile, setEditProfile] = useState(false)
  const [profileData, setProfileData] = useState({nombre:'',apellido:'',telefono:''})
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [songSearch, setSongSearch] = useState('')
  const [expandedSong, setExpandedSong] = useState<string|null>(null)

  useEffect(() => {
    async function load() {
      const [portalRes, songsRes] = await Promise.all([
        fetch(`/api/member-portal?token=${token}`),
        fetch('/api/all-songs'),
      ])
      if (!portalRes.ok) { setNotFound(true); setLoading(false); return }
      const data = await portalRes.json()
      const songsData = songsRes.ok ? await songsRes.json() : { songs: [] }
      setMember(data.member)
      setServices(data.services)
      setAllSongs(songsData.songs || [])
      setProfileData({ nombre: data.member.nombre, apellido: data.member.apellido||'', telefono: data.member.telefono||'' })
      if (data.services.length > 0) setExpandedSvc(data.services[0].service.id)
      setLoading(false)
    }
    load()
  }, [token])

  function fmtFecha(fecha: string) {
    const d = new Date(fecha + 'T12:00:00')
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return { dia: dias[d.getDay()], fecha: `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}` }
  }

  function daysUntil(fecha: string) {
    const today = new Date(); today.setHours(0,0,0,0)
    const svcDate = new Date(fecha + 'T12:00:00'); svcDate.setHours(0,0,0,0)
    return Math.round((svcDate.getTime() - today.getTime()) / (1000*60*60*24))
  }

  function statusBadge(status: string) {
    if (status==='confirmado') return <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">✓ Confirmado</span>
    if (status==='declinado')  return <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-semibold">✗ Declinado</span>
    return <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">⏳ Pendiente</span>
  }

  async function saveProfile() {
    setSavingProfile(true)
    const res = await fetch('/api/member-portal', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ token, ...profileData })
    })
    if (res.ok) { setMember(prev => prev ? {...prev,...profileData} : prev); setProfileMsg('¡Guardado!'); setEditProfile(false); setTimeout(()=>setProfileMsg(''),3000) }
    setSavingProfile(false)
  }

  const nextService = services[0] || null
  const filteredSongs = allSongs.filter(s =>
    s.nombre.toLowerCase().includes(songSearch.toLowerCase()) ||
    s.artista.toLowerCase().includes(songSearch.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F2A44] to-[#2E3D5C] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-white/60 text-sm">Cargando tu portal...</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-lg">
        <p className="text-5xl mb-4">🤔</p>
        <h2 className="font-bold text-xl text-gray-800 mb-2">Portal no encontrado</h2>
        <p className="text-sm text-gray-500">Este link no es válido o expiró.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#1F2A44] to-[#2E3D5C] pt-10 pb-20 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
        <div className="relative max-w-lg mx-auto">
          <p className="text-gold font-bold text-sm tracking-widest uppercase mb-6">ANCORA WORSHIP</p>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gold flex items-center justify-center text-navy font-black text-xl flex-shrink-0">
              {member?.nombre[0]}{member?.apellido?.[0]||''}
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">Hola, {member?.nombre} 👋</h1>
              <p className="text-white/60 text-sm mt-0.5">Portal del músico</p>
            </div>
          </div>

          {/* Next service preview in header */}
          {nextService && (()=>{
            const { dia, fecha } = fmtFecha(nextService.service.fecha)
            const days = daysUntil(nextService.service.fecha)
            return (
              <div className="mt-5 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Próximo servicio</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${days===0?'bg-gold text-navy':days<=3?'bg-amber-400 text-amber-900':'bg-white/20 text-white'}`}>
                    {days===0?'¡Hoy!':days===1?'Mañana':`En ${days} días`}
                  </span>
                </div>
                <p className="text-white font-bold text-base">{dia} {fecha}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-gold/30 text-gold text-xs px-2 py-0.5 rounded-full font-semibold">{nextService.posicion}</span>
                  {nextService.invitation && statusBadge(nextService.invitation.status)}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Tab bar floating */}
      <div className="max-w-lg mx-auto px-4 -mt-5 mb-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-1.5 flex gap-1">
          {([['home','🏠','Inicio'],['recursos','🎵','Canciones'],['perfil','👤','Perfil']] as [Tab,string,string][]).map(([t,icon,label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab===t ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8">

        {/* ── HOME TAB ─────────────────────────────────────────── */}
        {tab==='home' && (
          <div className="space-y-4">
            {services.length===0 && (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-4xl mb-3">🎶</p>
                <p className="text-gray-500 text-sm">No tienes servicios próximos asignados.</p>
              </div>
            )}

            {services.map(({ service, posicion, invitation, setlist, banda }) => {
              const isOpen = expandedSvc === service.id
              const { dia, fecha } = fmtFecha(service.fecha)
              const days = daysUntil(service.fecha)

              return (
                <div key={service.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  {/* Card header */}
                  <button onClick={() => setExpandedSvc(isOpen?null:service.id)}
                    className="w-full text-left p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${days===0?'bg-gold':days<=3?'bg-amber-100':'bg-navy/10'}`}>
                      <span className={`text-lg font-black leading-none ${days===0?'text-navy':days<=3?'text-amber-700':'text-navy'}`}>{new Date(service.fecha+'T12:00:00').getDate()}</span>
                      <span className={`text-xs ${days===0?'text-navy/70':days<=3?'text-amber-600':'text-gray-500'}`}>{fmtFecha(service.fecha).fecha.split(' ')[1]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-sm">{dia}, {fecha}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs bg-navy text-white px-2 py-0.5 rounded-full font-semibold">{posicion}</span>
                        {invitation && statusBadge(invitation.status)}
                        <span className="text-xs text-gray-400">{days===0?'¡Hoy!':days===1?'Mañana':`${days} días`}</span>
                      </div>
                    </div>
                    <span className={`text-gray-400 transition-transform ${isOpen?'rotate-180':''}`}>▼</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100">
                      {/* Confirm/decline */}
                      {invitation?.status==='pendiente' && (
                        <div className="p-4 bg-amber-50 border-b border-amber-100">
                          <p className="text-sm text-amber-800 font-medium mb-3">¿Puedes asistir?</p>
                          <div className="flex gap-2">
                            <a href={`/confirm/${invitation.token}?r=si`}
                              className="flex-1 bg-navy text-white text-center py-2.5 rounded-xl text-sm font-bold">✓ Confirmo</a>
                            <a href={`/confirm/${invitation.token}?r=no`}
                              className="flex-1 bg-white border border-gray-200 text-gray-600 text-center py-2.5 rounded-xl text-sm font-bold">✗ No puedo</a>
                          </div>
                        </div>
                      )}
                      {invitation?.status!=='pendiente' && (
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          {statusBadge(invitation?.status||'')}
                          <a href={`/confirm/${invitation?.token}`} className="text-xs text-gray-400 hover:text-navy underline">Cambiar</a>
                        </div>
                      )}

                      {/* Banda */}
                      <div className="p-4 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Banda del día</p>
                        <div className="grid grid-cols-2 gap-2">
                          {POSICIONES_ORDEN.map(pos => {
                            const b = banda.find(x => x.posicion===pos)
                            if (!b?.member) return null
                            const isMe = b.member.nombre===member?.nombre
                            return (
                              <div key={pos} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isMe?'bg-navy text-white':'bg-gray-50'}`}>
                                <span className="text-base">{POS_ICON[pos]||'🎵'}</span>
                                <div className="min-w-0">
                                  <p className={`text-xs font-bold ${isMe?'text-gold':'text-gray-400'}`}>{pos}</p>
                                  <p className={`text-xs truncate font-medium ${isMe?'text-white':'text-gray-700'}`}>{b.member.nombre}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Setlist */}
                      {setlist.length>0 && (
                        <div className="p-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Setlist</p>
                          <div className="space-y-2">
                            {setlist.map(item => (
                              <div key={item.orden} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-navy/10 text-navy text-xs font-bold flex items-center justify-center flex-shrink-0">{item.orden}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-navy truncate">{item.song?.nombre||'—'}</p>
                                  <p className="text-xs text-gray-500">{item.song?.artista}{item.tono?` · ${item.tono}`:''}{item.song?.bpm?` · ${item.song.bpm} BPM`:''}</p>
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0">
                                  {item.song?.link_spotify  && <a href={item.song.link_spotify}  target="_blank" className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm hover:bg-green-200">🎧</a>}
                                  {item.song?.link_letras   && <a href={item.song.link_letras}   target="_blank" className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-sm hover:bg-blue-200">📄</a>}
                                  {item.song?.link_recursos && <a href={item.song.link_recursos} target="_blank" className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center text-sm hover:bg-purple-200">📁</a>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── RECURSOS TAB ─────────────────────────────────────── */}
        {tab==='recursos' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-sm p-3">
              <input className="input" placeholder="🔍 Buscar canción o artista..." value={songSearch} onChange={e => setSongSearch(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400 text-center">{filteredSongs.length} canción{filteredSongs.length!==1?'es':''} en el repertorio</p>
            <div className="space-y-2">
              {filteredSongs.map(song => {
                const isOpen = expandedSong===song.id
                return (
                  <div key={song.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <button onClick={() => setExpandedSong(isOpen?null:song.id)}
                      className="w-full text-left p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-navy to-[#2E3D5C] flex items-center justify-center flex-shrink-0 text-xl">🎵</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy text-sm truncate">{song.nombre}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{song.artista}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {song.tono_original && <span className="text-xs bg-navy/10 text-navy px-2 py-0.5 rounded-full font-semibold">{song.tono_original}</span>}
                          {song.bpm && <span className="text-xs bg-gold/20 text-yellow-700 px-2 py-0.5 rounded-full">♩{song.bpm}</span>}
                          {song.compas && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{song.compas}</span>}
                        </div>
                      </div>
                      <span className={`text-gray-400 text-xs transition-transform flex-shrink-0 ${isOpen?'rotate-180':''}`}>▼</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-100 p-4 space-y-3">
                        {song.notas && (
                          <div className="bg-amber-50 rounded-xl p-3">
                            <p className="text-xs text-amber-700 font-medium mb-1">📝 Notas</p>
                            <p className="text-xs text-amber-800">{song.notas}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          {song.link_spotify && (
                            <a href={song.link_spotify} target="_blank"
                              className="flex flex-col items-center gap-1.5 bg-green-50 hover:bg-green-100 rounded-xl p-3 transition-colors">
                              <span className="text-2xl">🎧</span>
                              <span className="text-xs font-semibold text-green-700">Spotify</span>
                            </a>
                          )}
                          {song.link_letras && (
                            <a href={song.link_letras} target="_blank"
                              className="flex flex-col items-center gap-1.5 bg-blue-50 hover:bg-blue-100 rounded-xl p-3 transition-colors">
                              <span className="text-2xl">📄</span>
                              <span className="text-xs font-semibold text-blue-700">Letras</span>
                            </a>
                          )}
                          {song.link_recursos && (
                            <a href={song.link_recursos} target="_blank"
                              className="flex flex-col items-center gap-1.5 bg-purple-50 hover:bg-purple-100 rounded-xl p-3 transition-colors">
                              <span className="text-2xl">📁</span>
                              <span className="text-xs font-semibold text-purple-700">Recursos</span>
                            </a>
                          )}
                        </div>
                        {!song.link_spotify && !song.link_letras && !song.link_recursos && (
                          <p className="text-xs text-gray-400 text-center py-2">Sin links disponibles</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredSongs.length===0 && (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                  <p className="text-3xl mb-2">🎵</p>
                  <p className="text-gray-500 text-sm">{songSearch?'Sin resultados para tu búsqueda':'No hay canciones en el repertorio aún'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PERFIL TAB ───────────────────────────────────────── */}
        {tab==='perfil' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-navy to-[#2E3D5C] p-5 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gold flex items-center justify-center text-navy font-black text-2xl">
                  {member?.nombre[0]}{member?.apellido?.[0]||''}
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{member?.nombre} {member?.apellido}</p>
                  <p className="text-white/60 text-sm">{member?.email}</p>
                </div>
              </div>
              <div className="p-5">
                {profileMsg && <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-xl mb-3 font-medium">{profileMsg}</div>}
                {editProfile ? (
                  <div className="space-y-3">
                    {[
                      {label:'Nombre', key:'nombre'}, {label:'Apellido', key:'apellido'}, {label:'Teléfono', key:'telefono'}
                    ].map(({label,key}) => (
                      <div key={key}>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                        <input className="input" value={(profileData as any)[key]}
                          onChange={e => setProfileData({...profileData,[key]:e.target.value})} />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveProfile} disabled={savingProfile} className="btn-primary text-sm flex-1">
                        {savingProfile?'Guardando...':'Guardar'}
                      </button>
                      <button onClick={() => setEditProfile(false)} className="btn-secondary text-sm">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-3 mb-4">
                      {[
                        {label:'Nombre completo', value:`${member?.nombre} ${member?.apellido}`},
                        {label:'Email', value:member?.email},
                        {label:'Teléfono', value:member?.telefono||'—'},
                      ].map(({label,value}) => (
                        <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                          <span className="text-sm text-gray-500">{label}</span>
                          <span className="text-sm font-medium text-gray-800">{value}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setEditProfile(true)} className="btn-secondary w-full text-sm">✏️ Editar información</button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">Para cambiar email o instrumentos, contacta al administrador.</p>
          </div>
        )}
      </div>
    </div>
  )
}
