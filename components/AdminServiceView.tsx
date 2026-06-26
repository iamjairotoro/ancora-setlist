'use client'
import { useState } from 'react'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock } from '@/lib/types'


function toMMSS(totalSeconds: number): string {
  if (!totalSeconds) return '—'
  const m = Math.floor(totalSeconds / 60)
  const s = Math.round(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fromMMSS(val: string): number {
  if (!val) return 0
  if (val.includes(':')) {
    const [m, s] = val.split(':').map(Number)
    return (m || 0) * 60 + (s || 0)
  }
  return parseFloat(val) * 60
}

function totalToDisplay(seconds: number): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}:${s.toString().padStart(2,'0')}` : `${m} min`
}

const NOTAS = ['A','A#','Bb','B','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab']

const POS_ICON: Record<string,string> = {
  AG1:'🎸',AG2:'🎸',EG:'⚡',KEYS:'🎹',BASS:'🎸',DRUMS:'🥁',MD:'🎙',SONIDO:'🔊',
  VX1:'🎤',VX2:'🎤',VX3:'🎤',VX4:'🎤'
}

const BLOQUES_PRESET = [
  {titulo:'Preroll',duracion_min:3},
  {titulo:'MC / Bienvenida',duracion_min:5},
  {titulo:'Prédica',duracion_min:45},
  {titulo:'Plan de salvación',duracion_min:5},
  {titulo:'Ofrenda',duracion_min:5},
  {titulo:'Anuncios',duracion_min:5},
  {titulo:'Closing / Cierre',duracion_min:5},
]

interface Props {
  services: Service[]
  selectedService: Service|null
  setSelectedService: (s:Service)=>void
  createService: (fecha:string)=>void
  deleteService: (id:string)=>void
  duplicateService: (id:string,fecha:string)=>void
  members: Member[]
  songs: Song[]
  blocks: ServiceBlock[]
  bandaItems: BandaAssignment[]
  invitations: Invitation[]
  membersFor: (pos:string)=>Member[]
  getBanda: (pos:string)=>BandaAssignment|undefined
  assignBanda: (pos:string,memberId:string)=>void
  sendInvites: ()=>void
  sending: boolean
  msg: string
  onBlocksChange: ()=>void
  POSICIONES_BANDA: readonly string[]
  POSICIONES_VX: readonly string[]
}

export default function AdminServiceView({
  services,selectedService,setSelectedService,createService,
  deleteService,duplicateService,
  members,songs,blocks,bandaItems,invitations,
  membersFor,getBanda,assignBanda,
  sendInvites,sending,msg,onBlocksChange,
  POSICIONES_BANDA,POSICIONES_VX
}: Props) {
  const [showNew, setShowNew]   = useState(false)
  const [newFecha, setNewFecha] = useState('')
  const [showDup, setShowDup]   = useState(false)
  const [dupFecha, setDupFecha] = useState('')
  const [editingBlock, setEditingBlock] = useState<string|null>(null)

  function fmt(fecha:string) {
    const d=new Date(fecha+'T12:00:00')
    const dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  function fmtLong(fecha:string) {
    const d=new Date(fecha+'T12:00:00')
    const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  async function addBlock(tipo: 'cancion'|'bloque', preset?: {titulo:string,duracion_min:number}) {
    if(!selectedService) return
    const orden=(blocks.length||0)+1
    const body={
      service_id:selectedService.id, orden, tipo,
      titulo: preset?.titulo||(tipo==='cancion'?'Nueva canción':'Nuevo bloque'),
      duracion_min: preset?.duracion_min||5,
    }
    await fetch('/api/service-blocks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    onBlocksChange()
  }

  async function updateBlock(id:string, updates:Partial<ServiceBlock>) {
    await fetch('/api/service-blocks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...updates})})
    onBlocksChange()
  }

  async function deleteBlock(id:string) {
    await fetch('/api/service-blocks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    onBlocksChange()
  }

  const totalMin = blocks.reduce((s,b)=>{ const dur = b.tipo==='cancion' && (b.song as any)?.duracion_min ? (b.song as any).duracion_min : (b.duracion_min||0); return s+dur },0) // stored as seconds
  const confirmed  = invitations.filter(i=>i.status==='confirmado').length
  const declined   = invitations.filter(i=>i.status==='declinado').length
  const pending    = invitations.filter(i=>i.status==='pendiente').length

  function statusDot(status:string) {
    if(status==='confirmado') return <span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>
    if(status==='declinado')  return <span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>
    return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>
  }

  function getMemberInvStatus(memberId?:string) {
    if(!memberId) return null
    return invitations.find(i=>i.member_id===memberId)?.status||null
  }

  return (
    <div className="space-y-4">
      {/* Service selector bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <select className="input flex-1 min-w-48 font-medium"
          value={selectedService?.id||''}
          onChange={e=>{const s=services.find(sv=>sv.id===e.target.value);if(s)setSelectedService(s)}}>
          {services.map(s=><option key={s.id} value={s.id}>{fmt(s.fecha)} — {s.titulo}</option>)}
          {!services.length&&<option>Sin servicios aún</option>}
        </select>
        <div className="flex gap-2">
          <button onClick={()=>setShowNew(v=>!v)} className="btn-primary text-sm">+ Nuevo</button>
          {selectedService&&<>
            <button onClick={()=>setShowDup(v=>!v)} className="btn-secondary text-sm" title="Duplicar">⧉ Duplicar</button>
            <button onClick={()=>deleteService(selectedService.id)} className="text-sm text-red-400 hover:text-red-600 px-2">🗑</button>
          </>}
        </div>
      </div>

      {showNew&&(
        <div className="bg-white rounded-2xl shadow-sm border border-navy/30 p-4 flex gap-3 items-end">
          <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block font-medium">Fecha</label>
            <input type="date" className="input" value={newFecha} onChange={e=>setNewFecha(e.target.value)}/></div>
          <button onClick={()=>{if(newFecha){createService(newFecha);setNewFecha('');setShowNew(false)}}} className="btn-primary">Crear</button>
          <button onClick={()=>setShowNew(false)} className="btn-secondary">✕</button>
        </div>
      )}
      {showDup&&selectedService&&(
        <div className="bg-white rounded-2xl shadow-sm border border-gold/50 p-4 flex gap-3 items-end">
          <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block font-medium">Duplicar a fecha:</label>
            <input type="date" className="input" value={dupFecha} onChange={e=>setDupFecha(e.target.value)}/></div>
          <button onClick={()=>{if(dupFecha){duplicateService(selectedService.id,dupFecha);setDupFecha('');setShowDup(false)}}} className="btn-gold">Duplicar</button>
          <button onClick={()=>setShowDup(false)} className="btn-secondary">✕</button>
        </div>
      )}

      {selectedService&&(
        <div>
          {/* Title */}
          <div className="mb-4">
            <h2 className="text-xl font-black text-[#1F2A44]">{fmtLong(selectedService.fecha)}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{selectedService.titulo}</p>
          </div>

          {/* Main 2-col layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* LEFT: Banda panel */}
            <div className="lg:col-span-1 space-y-3">

              {/* Send invites summary */}
              <div className="bg-[#1F2A44] rounded-2xl p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm">✉️ Invitaciones</p>
                  {invitations.length>0&&(
                    <div className="flex gap-1.5 text-xs">
                      <span className="bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full">{confirmed} ✓</span>
                      <span className="bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full">{declined} ✗</span>
                      <span className="bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full">{pending} ⏳</span>
                    </div>
                  )}
                </div>
                <button onClick={sendInvites} disabled={sending}
                  className="w-full bg-[#C9A14A] hover:bg-[#b8912f] text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50">
                  {sending?'Enviando...':`${invitations.length?'Reenviar':'Enviar'} invitaciones`}
                </button>
                {msg&&<p className="text-green-300 text-xs mt-2 text-center">{msg}</p>}
              </div>

              {/* Banda */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="font-bold text-sm text-[#1F2A44]">🎸 Banda</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {POSICIONES_BANDA.map(pos=>{
                    const asig=getBanda(pos)
                    const opts=membersFor(pos)
                    const status=getMemberInvStatus(asig?.member_id)
                    return(
                      <div key={pos} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-lg w-6 flex-shrink-0">{POS_ICON[pos]}</span>
                        <div className="w-14 flex-shrink-0">
                          <p className="text-xs font-bold text-gray-400">{pos}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <select className="w-full bg-transparent border-none text-sm font-medium text-[#1F2A44] focus:outline-none cursor-pointer p-0"
                            value={asig?.member_id||''}
                            onChange={e=>assignBanda(pos,e.target.value)}>
                            <option value="">— Asignar —</option>
                            {opts.map(m=><option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                          </select>
                        </div>
                        {status&&<span className="flex-shrink-0">{statusDot(status)}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Voces */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-bold text-sm text-[#1F2A44]">🎤 Voces</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {POSICIONES_VX.map(pos=>{
                    const asig=getBanda(pos)
                    const opts=membersFor(pos)
                    const status=getMemberInvStatus(asig?.member_id)
                    return(
                      <div key={pos} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-lg w-6 flex-shrink-0">{POS_ICON[pos]}</span>
                        <div className="w-14 flex-shrink-0">
                          <p className="text-xs font-bold text-gray-400">{pos}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <select className="w-full bg-transparent border-none text-sm font-medium text-[#1F2A44] focus:outline-none cursor-pointer p-0"
                            value={asig?.member_id||''}
                            onChange={e=>assignBanda(pos,e.target.value)}>
                            <option value="">— Asignar —</option>
                            {opts.map(m=><option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                          </select>
                        </div>
                        {status&&<span className="flex-shrink-0">{statusDot(status)}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Confirmations detail */}
              {invitations.length>0&&(
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-bold text-sm text-[#1F2A44]">Respuestas</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {invitations.map(inv=>(
                      <div key={inv.id} className="flex items-center gap-2 px-4 py-2.5">
                        {statusDot(inv.status)}
                        <p className="text-sm flex-1 font-medium">{inv.member?.nombre} {inv.member?.apellido}</p>
                        {inv.comentario&&<p className="text-xs text-gray-400 truncate max-w-24" title={inv.comentario}>"{inv.comentario}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Order of service */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#1F2A44]">Orden del servicio</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {blocks.length} items · {totalToDisplay(totalMin)} total
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative group">
                      <button className="btn-secondary text-xs py-1.5">+ Bloque ▾</button>
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 hidden group-hover:block w-48">
                        {BLOQUES_PRESET.map(b=>(
                          <button key={b.titulo} onClick={()=>addBlock('bloque',b)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">
                            {b.titulo} <span className="text-gray-400 text-xs">{b.duracion_min}min</span>
                          </button>
                        ))}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button onClick={()=>addBlock('bloque')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-500">
                            + Bloque personalizado
                          </button>
                        </div>
                      </div>
                    </div>
                    <button onClick={()=>addBlock('cancion')} className="btn-primary text-xs py-1.5">🎵 + Canción</button>
                  </div>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <div className="col-span-1">Min</div>
                  <div className="col-span-5">Título</div>
                  <div className="col-span-2">Tono</div>
                  <div className="col-span-3">Lead / Voz</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Blocks list */}
                <div className="divide-y divide-gray-50">
                  {blocks.length===0&&(
                    <div className="py-12 text-center">
                      <p className="text-gray-300 text-4xl mb-3">📋</p>
                      <p className="text-gray-400 text-sm">Sin items. Agrega una canción o bloque.</p>
                    </div>
                  )}
                  {blocks.map((block)=>{
                    const isEditing=editingBlock===block.id
                    const isSong=block.tipo==='cancion'
                    return(
                      <div key={block.id} className={`grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-gray-50 transition-colors ${isSong?'':'bg-gray-50/50'}`}>
                        {/* Duration — read-only for songs, editable for blocks */}
                        <div className="col-span-1">
                          {isSong && block.song && (block.song as any).duracion_min ? (
                            <span className="text-xs font-mono text-navy bg-navy/10 px-1.5 py-0.5 rounded" title="Duración desde base de datos">
                              {toMMSS((block.song as any).duracion_min)}
                            </span>
                          ) : isSong ? (
                            <span className="text-xs font-mono text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">—</span>
                          ) : isEditing ? (
                            <input type="text" placeholder="mm:ss" className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-xs text-center focus:outline-none focus:border-navy"
                              defaultValue={block.duracion_min ? toMMSS(block.duracion_min) : ''}
                              onBlur={e=>updateBlock(block.id,{duracion_min:fromMMSS(e.target.value)||0})}/>
                          ) : (
                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {block.duracion_min ? toMMSS(block.duracion_min) : '—'}
                            </span>
                          )}
                        </div>

                        {/* Title / Song */}
                        <div className="col-span-5">
                          {isSong?(
                            <select className="w-full bg-transparent border-none text-sm font-semibold text-[#1F2A44] focus:outline-none cursor-pointer"
                              value={block.song_id||''}
                              onChange={e=>updateBlock(block.id,{song_id:e.target.value||undefined,titulo:songs.find(s=>s.id===e.target.value)?.nombre||''})}>
                              <option value="">— Seleccionar canción —</option>
                              {songs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                          ):(
                            isEditing?(
                              <input className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-navy"
                                value={block.titulo||''}
                                onChange={e=>updateBlock(block.id,{titulo:e.target.value})}/>
                            ):(
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-medium">bloque</span>
                                <span className="text-sm text-gray-600 font-medium">{block.titulo||'—'}</span>
                              </div>
                            )
                          )}
                          {block.song&&!isEditing&&(
                            <div className="flex gap-1.5 mt-1">
                              {(block.song as any).link_spotify&&<a href={(block.song as any).link_spotify} target="_blank" className="text-xs text-green-600 hover:underline">Spotify</a>}
                              {(block.song as any).link_letras&&<a href={(block.song as any).link_letras} target="_blank" className="text-xs text-blue-600 hover:underline">Letras</a>}
                              {(block.song as any).link_recursos&&<a href={(block.song as any).link_recursos} target="_blank" className="text-xs text-purple-600 hover:underline">Recursos</a>}
                            </div>
                          )}
                        </div>

                        {/* Tono */}
                        <div className="col-span-2">
                          {isSong?(
                            <select className="w-full bg-transparent border-none text-sm text-gray-600 focus:outline-none cursor-pointer"
                              value={block.tono||''}
                              onChange={e=>updateBlock(block.id,{tono:e.target.value||undefined})}>
                              <option value="">—</option>
                              {NOTAS.map(n=><option key={n}>{n}</option>)}
                            </select>
                          ):(
                            isEditing&&<input type="number" placeholder="min" className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-xs focus:outline-none focus:border-navy"
                              value={block.duracion_min||''}
                              onChange={e=>updateBlock(block.id,{duracion_min:parseInt(e.target.value)||0})}/>
                          )}
                        </div>

                        {/* Lead */}
                        <div className="col-span-3">
                          {isSong&&(
                            <select className="w-full bg-transparent border-none text-sm text-gray-600 focus:outline-none cursor-pointer"
                              value={block.lead_id||''}
                              onChange={e=>updateBlock(block.id,{lead_id:e.target.value||undefined})}>
                              <option value="">— Lead —</option>
                              {members.filter(m=>m.instrumentos.includes('Voz')).map(m=>(
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex justify-end gap-1">
                          <button onClick={()=>setEditingBlock(isEditing?null:block.id)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-colors ${isEditing?'bg-navy text-white':'hover:bg-gray-100 text-gray-400'}`}>
                            {isEditing?'✓':'✏'}
                          </button>
                          <button onClick={()=>deleteBlock(block.id)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer total */}
                {blocks.length>0&&(
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-400">{blocks.length} items</span>
                    <span className="text-sm font-bold text-[#1F2A44]">Total: {totalToDisplay(totalMin)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
