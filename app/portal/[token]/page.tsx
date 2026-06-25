'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Song { nombre: string; artista: string; link_spotify?: string; link_letras?: string }
interface SetlistItem { orden: number; tono?: string; link?: string; song?: Song; lead?: { nombre: string } }
interface BandaItem { posicion: string; member?: { nombre: string } }
interface ServiceData {
  service: { id: string; fecha: string; titulo: string }
  posicion: string
  invitation: { status: string; comentario?: string; token: string } | null
  setlist: SetlistItem[]
  banda: BandaItem[]
}
interface Member { nombre: string; apellido: string; email: string; telefono?: string }

const POSICIONES_ORDEN = ['AG1','AG2','EG','KEYS','BASS','DRUMS','MD','SONIDO','VX1','VX2','VX3','VX4']

export default function PortalPage() {
  const { token } = useParams<{ token: string }>()
  const [member, setMember] = useState<Member | null>(null)
  const [services, setServices] = useState<ServiceData[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<'servicios'|'perfil'>('servicios')
  const [editProfile, setEditProfile] = useState(false)
  const [profileData, setProfileData] = useState({ nombre:'', apellido:'', telefono:'' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [expandedService, setExpandedService] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/member-portal?token=${token}`)
      if (!res.ok) { setNotFound(true); setLoading(false); return }
      const data = await res.json()
      setMember(data.member)
      setServices(data.services)
      setProfileData({ nombre: data.member.nombre, apellido: data.member.apellido || '', telefono: data.member.telefono || '' })
      if (data.services.length > 0) setExpandedService(data.services[0].service.id)
      setLoading(false)
    }
    load()
  }, [token])

  function fmt(fecha: string) {
    const d = new Date(fecha + 'T12:00:00')
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  function statusBadge(status: string) {
    if (status === 'confirmado') return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Confirmado</span>
    if (status === 'declinado')  return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">✗ Declinado</span>
    return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⏳ Pendiente</span>
  }

  async function saveProfile() {
    setSavingProfile(true)
    const res = await fetch('/api/member-portal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...profileData })
    })
    if (res.ok) {
      setMember(prev => prev ? { ...prev, ...profileData } : prev)
      setProfileMsg('Guardado ✓')
      setEditProfile(false)
      setTimeout(() => setProfileMsg(''), 3000)
    }
    setSavingProfile(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 text-center max-w-sm">
        <p className="text-4xl mb-3">🤔</p>
        <h2 className="font-semibold text-navy mb-2">Portal no encontrado</h2>
        <p className="text-sm text-gray-500">Este link no es válido.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy text-white px-5 py-4">
        <p className="text-gold font-bold text-base">Ancora</p>
        <p className="text-white/70 text-xs mt-0.5">Portal del músico</p>
        {member && <p className="text-white font-medium mt-2">{member.nombre} {member.apellido}</p>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        {(['servicios','perfil'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === t ? 'border-navy text-navy' : 'border-transparent text-gray-500'
            }`}>
            {t === 'servicios' ? '🎵 Mis Servicios' : '👤 Mi Perfil'}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* SERVICIOS TAB */}
        {activeTab === 'servicios' && (
          <div className="space-y-3">
            {services.length === 0 && (
              <div className="card p-6 text-center">
                <p className="text-gray-400 text-sm">No tienes servicios próximos asignados.</p>
              </div>
            )}
            {services.map(({ service, posicion, invitation, setlist, banda }) => {
              const isOpen = expandedService === service.id
              return (
                <div key={service.id} className="card overflow-hidden">
                  {/* Service header */}
                  <button onClick={() => setExpandedService(isOpen ? null : service.id)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-navy text-sm">{fmt(service.fecha)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-navy/10 text-navy px-2 py-0.5 rounded font-medium">{posicion}</span>
                        {invitation && statusBadge(invitation.status)}
                      </div>
                    </div>
                    <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 space-y-4">

                      {/* Confirm/decline buttons if pending */}
                      {invitation && invitation.status === 'pendiente' && (
                        <div className="flex gap-2">
                          <a href={`/confirm/${invitation.token}?r=si`}
                            className="flex-1 bg-navy text-white text-center py-2.5 rounded-lg text-sm font-medium">
                            ✓ Confirmar
                          </a>
                          <a href={`/confirm/${invitation.token}?r=no`}
                            className="flex-1 bg-white border border-gray-200 text-gray-600 text-center py-2.5 rounded-lg text-sm font-medium">
                            ✗ No puedo
                          </a>
                        </div>
                      )}
                      {invitation && invitation.status !== 'pendiente' && (
                        <div className="flex items-center justify-between">
                          {statusBadge(invitation.status)}
                          <a href={`/confirm/${invitation.token}`}
                            className="text-xs text-gray-400 hover:text-navy underline">Cambiar</a>
                        </div>
                      )}

                      {/* Banda */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🎸 Banda del día</p>
                        <div className="grid grid-cols-2 gap-1">
                          {POSICIONES_ORDEN.map(pos => {
                            const b = banda.find(x => x.posicion === pos)
                            if (!b?.member) return null
                            const isMe = b.member.nombre === member?.nombre
                            return (
                              <div key={pos} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${isMe ? 'bg-navy text-white' : 'bg-gray-50'}`}>
                                <span className={`font-semibold w-12 ${isMe ? 'text-gold' : 'text-gray-400'}`}>{pos}</span>
                                <span className={isMe ? 'text-white' : 'text-gray-700'}>{b.member.nombre}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Setlist */}
                      {setlist.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📋 Setlist</p>
                          <div className="space-y-1.5">
                            {setlist.map(item => (
                              <div key={item.orden} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                <span className="text-xs text-gray-400 w-4">{item.orden}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.song?.nombre || '—'}</p>
                                  <p className="text-xs text-gray-500">{item.song?.artista}{item.tono ? ` · ${item.tono}` : ''}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  {item.song?.link_spotify && (
                                    <a href={item.song.link_spotify} target="_blank"
                                      className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                      Spotify
                                    </a>
                                  )}
                                  {item.song?.link_letras && (
                                    <a href={item.song.link_letras} target="_blank"
                                      className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                      Letras
                                    </a>
                                  )}
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

        {/* PERFIL TAB */}
        {activeTab === 'perfil' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-navy">Mi información</h2>
              {!editProfile && (
                <button onClick={() => setEditProfile(true)}
                  className="text-sm text-navy hover:underline">Editar</button>
              )}
            </div>

            {profileMsg && <p className="text-green-600 text-sm mb-3">{profileMsg}</p>}

            {editProfile ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                  <input className="input" value={profileData.nombre}
                    onChange={e => setProfileData({...profileData, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Apellido</label>
                  <input className="input" value={profileData.apellido}
                    onChange={e => setProfileData({...profileData, apellido: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                  <input className="input" value={profileData.telefono}
                    onChange={e => setProfileData({...profileData, telefono: e.target.value})} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveProfile} disabled={savingProfile} className="btn-primary text-sm flex-1">
                    {savingProfile ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditProfile(false)} className="btn-secondary text-sm">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Nombre', value: `${member?.nombre} ${member?.apellido}` },
                  { label: 'Email', value: member?.email },
                  { label: 'Teléfono', value: member?.telefono || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Para cambiar tu email o instrumentos, contacta al administrador.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
