'use client'
import { useState } from 'react'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock } from '@/lib/types'
import TexBg from './TexBg'

const NOTAS = ['A','A#','Bb','B','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab']

const BLOQUES_PRESET = [
  {titulo:'Preroll',duracion_min:180},
  {titulo:'MC / Bienvenida',duracion_min:300},
  {titulo:'Prédica',duracion_min:2700},
  {titulo:'Plan de salvación',duracion_min:300},
  {titulo:'Ofrenda',duracion_min:300},
  {titulo:'Anuncios',duracion_min:300},
  {titulo:'Closing / Cierre',duracion_min:300},
]

function toMMSS(secs: number): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${s.toString().padStart(2,'0')}`
}
function fromMMSS(val: string): number {
  if (!val) return 0
  if (val.includes(':')) { const [m,s]=val.split(':').map(Number); return (m||0)*60+(s||0) }
  return parseFloat(val)*60
}
function totalToDisplay(seconds: number): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds/60)
  const s = Math.round(seconds%60)
  return s > 0 ? `${m}:${s.toString().padStart(2,'0')}` : `${m} min`
}

const C = {
  crema: '#F5F0E6',
  cremaDark: '#E0D8C8',
  txt: '#1A1A1A',
  muted: '#999',
  bg: '#FDFCF9',
}

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

const sel: React.CSSProperties = {
  width:'100%', background:'transparent', border:'none',
  fontSize:11, fontWeight:500, color:C.txt, outline:'none', cursor:'pointer',
  fontFamily:'"Helvetica Neue",Helvetica,Arial,sans-serif',
}

export default function AdminServiceView({
  services,selectedService,setSelectedService,createService,
  deleteService,duplicateService,
  members,songs,blocks,bandaItems,invitations,
  membersFor,getBanda,assignBanda,
  sendInvites,sending,msg,onBlocksChange,
  POSICIONES_BANDA,POSICIONES_VX
}: Props) {
  const [showNew,setShowNew]     = useState(false)
  const [newFecha,setNewFecha]   = useState('')
  const [showDup,setShowDup]     = useState(false)
  const [dupFecha,setDupFecha]   = useState('')
  const [editingBlock,setEditingBlock] = useState<string|null>(null)
  const [showPresets,setShowPresets]   = useState(false)

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

  async function addBlock(tipo:'cancion'|'bloque', preset?:{titulo:string,duracion_min:number}) {
    if(!selectedService) return
    const orden=(blocks.length||0)+1
    await fetch('/api/service-blocks',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({service_id:selectedService.id,orden,tipo,
        titulo:preset?.titulo||(tipo==='cancion'?'Nueva canción':'Nuevo bloque'),
        duracion_min:preset?.duracion_min||300})})
    onBlocksChange()
    setShowPresets(false)
  }
  async function updateBlock(id:string, updates:Partial<ServiceBlock>) {
    await fetch('/api/service-blocks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...updates})})
    onBlocksChange()
  }
  async function deleteBlock(id:string) {
    await fetch('/api/service-blocks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    onBlocksChange()
  }

  const totalSecs = blocks.reduce((s,b)=>{
    const dur = b.tipo==='cancion' && (b.song as any)?.duracion_min ? (b.song as any).duracion_min : (b.duracion_min||0)
    return s+dur
  },0)
  const confirmed = invitations.filter(i=>i.status==='confirmado').length
  const declined  = invitations.filter(i=>i.status==='declinado').length
  const pending   = invitations.filter(i=>i.status==='pendiente').length

  function getMemberInvStatus(memberId?:string) {
    if(!memberId) return null
    return invitations.find(i=>i.member_id===memberId)?.status||null
  }

  function statusDot(status:string) {
    const color = status==='confirmado'?'#52B788':status==='declinado'?'#E24B4A':'#F4A261'
    return <span style={{width:6,height:6,borderRadius:'50%',background:color,display:'inline-block',flexShrink:0}}/>
  }

  const input: React.CSSProperties = {
    border:`0.5px solid ${C.cremaDark}`, borderRadius:8, padding:'6px 10px',
    fontSize:12, fontFamily:'inherit', outline:'none', background:'white', color:C.txt,
  }
  const btn: React.CSSProperties = {
    border:`0.5px solid ${C.cremaDark}`, borderRadius:8, padding:'6px 12px',
    fontSize:11, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
    background:'white', color:C.txt,
  }
  const btnDark: React.CSSProperties = {
    ...btn, background:C.txt, color:C.crema, border:'none',
  }

  return (
    <div>
      {/* Service selector bar */}
      <div style={{background:'white',border:`0.5px solid ${C.cremaDark}`,borderRadius:12,padding:'10px 14px',marginBottom:12,display:'flex',flexWrap:'wrap',gap:10,alignItems:'center'}}>
        <select style={{...input,flex:1,minWidth:200,fontWeight:500}}
          value={selectedService?.id||''}
          onChange={e=>{const s=services.find(sv=>sv.id===e.target.value);if(s)setSelectedService(s)}}>
          {services.map(s=><option key={s.id} value={s.id}>{fmt(s.fecha)} — {s.titulo}</option>)}
          {!services.length&&<option>Sin servicios aún</option>}
        </select>
        <div style={{display:'flex',gap:6}}>
          <button style={btnDark} onClick={()=>setShowNew(v=>!v)}>+ Nuevo</button>
          {selectedService&&<>
            <button style={btn} onClick={()=>setShowDup(v=>!v)}>⧉ Duplicar</button>
            <button style={{...btn,color:'#E24B4A'}} onClick={()=>deleteService(selectedService.id)}>🗑</button>
          </>}
        </div>
      </div>

      {showNew&&(
        <div style={{background:'white',border:`1px solid ${C.txt}`,borderRadius:12,padding:'12px 14px',marginBottom:12,display:'flex',gap:10,alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Fecha</div>
            <input type="date" style={input} value={newFecha} onChange={e=>setNewFecha(e.target.value)}/>
          </div>
          <button style={btnDark} onClick={()=>{if(newFecha){createService(newFecha);setNewFecha('');setShowNew(false)}}}>Crear</button>
          <button style={btn} onClick={()=>setShowNew(false)}>✕</button>
        </div>
      )}
      {showDup&&selectedService&&(
        <div style={{background:'white',border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:'12px 14px',marginBottom:12,display:'flex',gap:10,alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Duplicar a fecha</div>
            <input type="date" style={input} value={dupFecha} onChange={e=>setDupFecha(e.target.value)}/>
          </div>
          <button style={btnDark} onClick={()=>{if(dupFecha){duplicateService(selectedService.id,dupFecha);setDupFecha('');setShowDup(false)}}}>Duplicar</button>
          <button style={btn} onClick={()=>setShowDup(false)}>✕</button>
        </div>
      )}

      {selectedService&&(
        <div>
          {/* Title + live badge */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
            <div>
              <h2 style={{fontSize:20,fontWeight:700,color:C.txt,letterSpacing:'-0.3px'}}>{fmtLong(selectedService.fecha)}</h2>
              <p style={{fontSize:11,fontWeight:300,color:C.muted,marginTop:2}}>{selectedService.titulo}</p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,background:'#D8F3DC',padding:'3px 10px',borderRadius:20}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#52B788',display:'inline-block'}}/>
              <span style={{fontSize:9,fontWeight:600,color:'#1B4332'}}>En vivo</span>
            </div>
          </div>

          {/* 3-col layout */}
          <div style={{display:'grid',gridTemplateColumns:'160px 1fr',gap:12}}>

            {/* LEFT — Banda + Invitaciones */}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>

              {/* Invitaciones card */}
              <div style={{background:C.txt,borderRadius:12,padding:'12px 14px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.crema}}>Invitaciones</span>
                  {invitations.length>0&&(
                    <div style={{display:'flex',gap:4}}>
                      <span style={{fontSize:7,fontWeight:700,background:'rgba(82,183,136,0.25)',color:'#A8F0C6',padding:'1px 5px',borderRadius:10}}>✓ {confirmed}</span>
                      <span style={{fontSize:7,fontWeight:700,background:'rgba(226,75,74,0.25)',color:'#FFB3B3',padding:'1px 5px',borderRadius:10}}>✗ {declined}</span>
                      <span style={{fontSize:7,fontWeight:700,background:'rgba(244,162,97,0.25)',color:'#FFD4A3',padding:'1px 5px',borderRadius:10}}>⏳ {pending}</span>
                    </div>
                  )}
                </div>
                <button onClick={sendInvites} disabled={sending}
                  style={{width:'100%',background:'#C9A14A',color:'white',border:'none',borderRadius:8,padding:'8px',fontSize:11,fontWeight:700,fontFamily:'inherit',cursor:'pointer',opacity:sending?0.6:1}}>
                  {sending?'Enviando...':`${invitations.length?'Reenviar':'Enviar'} invitaciones`}
                </button>
                {msg&&<p style={{fontSize:9,color:'#A8F0C6',marginTop:6,textAlign:'center'}}>{msg}</p>}
              </div>

              {/* Banda */}
              <div style={{background:'white',border:`0.5px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
                <div style={{padding:'8px 12px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
                  <span style={{fontSize:8,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Banda</span>
                </div>
                <div>
                  {POSICIONES_BANDA.map(pos=>{
                    const asig=getBanda(pos)
                    const opts=membersFor(pos)
                    const status=getMemberInvStatus(asig?.member_id)
                    return(
                      <div key={pos} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderBottom:`0.5px solid ${C.crema}`}}>
                        <span style={{fontSize:8,fontWeight:700,color:C.muted,width:36,flexShrink:0,letterSpacing:0.3}}>{pos}</span>
                        <select style={sel} value={asig?.member_id||''} onChange={e=>assignBanda(pos,e.target.value)}>
                          <option value="">— Asignar —</option>
                          {opts.map(m=><option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                        </select>
                        {status&&statusDot(status)}
                      </div>
                    )
                  })}
                </div>
                <div style={{padding:'6px 12px',background:C.crema,borderTop:`0.5px solid ${C.cremaDark}`}}>
                  <span style={{fontSize:8,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Voces</span>
                </div>
                <div>
                  {POSICIONES_VX.map(pos=>{
                    const asig=getBanda(pos)
                    const opts=membersFor(pos)
                    const status=getMemberInvStatus(asig?.member_id)
                    return(
                      <div key={pos} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderBottom:`0.5px solid ${C.crema}`}}>
                        <span style={{fontSize:8,fontWeight:700,color:C.muted,width:36,flexShrink:0}}>{pos}</span>
                        <select style={sel} value={asig?.member_id||''} onChange={e=>assignBanda(pos,e.target.value)}>
                          <option value="">— Asignar —</option>
                          {opts.map(m=><option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                        </select>
                        {status&&statusDot(status)}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Equipo unificado */}
              {(()=>{
                const allPos=[...POSICIONES_BANDA,...POSICIONES_VX]
                const byMember: Record<string,{member:any,roles:string[],status:string|null}> = {}
                allPos.forEach(pos=>{
                  const asig=getBanda(pos)
                  if(!asig?.member_id||!asig.member) return
                  if(!byMember[asig.member_id]) byMember[asig.member_id]={member:asig.member,roles:[],status:getMemberInvStatus(asig.member_id)}
                  byMember[asig.member_id].roles.push(pos)
                })
                const entries=Object.values(byMember)
                if(!entries.length) return null
                return(
                  <div style={{background:'white',border:`0.5px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
                    <div style={{padding:'8px 12px',background:C.crema,borderBottom:`0.5px solid ${C.cremaDark}`}}>
                      <span style={{fontSize:8,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Equipo del domingo</span>
                    </div>
                    <div style={{padding:'8px'}}>
                      {entries.map(({member,roles,status})=>(
                        <div key={member.id} style={{display:'flex',alignItems:'center',gap:8,background:C.bg,borderRadius:8,padding:'5px 8px',marginBottom:4}}>
                          <div style={{width:28,height:28,borderRadius:'50%',background:C.txt,color:C.crema,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,flexShrink:0}}>
                            {member.nombre?.[0]}{member.apellido?.[0]||''}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:9,fontWeight:600,color:C.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{member.nombre} {member.apellido}</div>
                            <div style={{display:'flex',gap:2,flexWrap:'wrap',marginTop:2}}>
                              {roles.map(r=><span key={r} style={{fontSize:6,fontWeight:700,background:'rgba(0,0,0,0.07)',color:C.txt,padding:'1px 3px',borderRadius:3}}>{r}</span>)}
                            </div>
                          </div>
                          {status==='confirmado'&&<span style={{fontSize:7,background:'#D8F3DC',color:'#1B4332',padding:'1px 5px',borderRadius:10,fontWeight:700}}>✓</span>}
                          {status==='declinado' &&<span style={{fontSize:7,background:'#FEE2E2',color:'#991B1B',padding:'1px 5px',borderRadius:10,fontWeight:700}}>✗</span>}
                          {status==='pendiente' &&<span style={{fontSize:7,background:'#FFF3CD',color:'#664D03',padding:'1px 5px',borderRadius:10,fontWeight:700}}>⏳</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Respuestas */}
              {invitations.length>0&&(
                <div style={{background:'white',border:`0.5px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
                  <div style={{padding:'8px 12px',background:C.crema,borderBottom:`0.5px solid ${C.cremaDark}`}}>
                    <span style={{fontSize:8,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Respuestas</span>
                  </div>
                  <div style={{padding:'6px 0'}}>
                    {invitations.map(inv=>(
                      <div key={inv.id} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 12px',borderBottom:`0.5px solid ${C.crema}`}}>
                        {statusDot(inv.status)}
                        <span style={{fontSize:9,fontWeight:500,color:C.txt,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inv.member?.nombre} {inv.member?.apellido}</span>
                        {inv.comentario&&<span style={{fontSize:8,fontWeight:300,color:C.muted,fontStyle:'italic',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>"{inv.comentario}"</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Order of service */}
            <div style={{background:'white',border:`0.5px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
              {/* Header */}
              <div style={{padding:'10px 14px',borderBottom:`0.5px solid ${C.cremaDark}`,display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
                <div>
                  <span style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.txt}}>Orden del servicio</span>
                  <span style={{fontSize:9,fontWeight:300,color:C.muted,marginLeft:8}}>{blocks.length} items · {totalToDisplay(totalSecs)}</span>
                </div>
                <div style={{display:'flex',gap:6,position:'relative'}}>
                  <div style={{position:'relative'}}>
                    <button style={btn} onClick={()=>setShowPresets(v=>!v)}>+ Bloque ▾</button>
                    {showPresets&&(
                      <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:'white',border:`0.5px solid ${C.cremaDark}`,borderRadius:10,boxShadow:'0 4px 16px rgba(0,0,0,0.08)',zIndex:20,width:180,padding:'4px 0'}}>
                        {BLOQUES_PRESET.map(b=>(
                          <button key={b.titulo} onClick={()=>addBlock('bloque',b)}
                            style={{width:'100%',textAlign:'left',padding:'7px 14px',fontSize:11,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:C.txt,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            {b.titulo}<span style={{fontSize:9,color:C.muted}}>{toMMSS(b.duracion_min)}</span>
                          </button>
                        ))}
                        <div style={{borderTop:`0.5px solid ${C.cremaDark}`,margin:'2px 0'}}/>
                        <button onClick={()=>addBlock('bloque')}
                          style={{width:'100%',textAlign:'left',padding:'7px 14px',fontSize:11,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:C.muted}}>
                          + Personalizado
                        </button>
                      </div>
                    )}
                  </div>
                  <button style={btnDark} onClick={()=>addBlock('cancion')}>🎵 + Canción</button>
                </div>
              </div>

              {/* Column headers */}
              <div style={{display:'grid',gridTemplateColumns:'44px 1fr 90px 110px 20px',padding:'4px 14px',background:C.crema,borderBottom:`0.5px solid ${C.cremaDark}`}}>
                {['Min','Título','Tono','Lead / Voz',''].map((h,i)=>(
                  <span key={i} style={{fontSize:8,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.muted}}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {blocks.length===0&&(
                <div style={{padding:'40px',textAlign:'center',color:C.muted,fontSize:12,fontWeight:300}}>
                  Sin items. Agrega una canción o bloque.
                </div>
              )}
              {blocks.map(block=>{
                const isEditing=editingBlock===block.id
                const isSong=block.tipo==='cancion'
                const songDur=(block.song as any)?.duracion_min
                return(
                  <div key={block.id} style={{display:'grid',gridTemplateColumns:'44px 1fr 90px 110px 20px',padding:'7px 14px',borderBottom:`0.5px solid ${C.crema}`,alignItems:'center',background:isSong?'white':C.bg}}>
                    {/* Duration */}
                    <div>
                      {isSong && songDur ? (
                        <span style={{fontSize:9,fontWeight:500,background:'rgba(0,0,0,0.06)',color:C.txt,padding:'1px 5px',borderRadius:4,fontVariantNumeric:'tabular-nums'}}>{toMMSS(songDur)}</span>
                      ) : isSong ? (
                        <span style={{fontSize:9,fontWeight:300,color:'#CCC'}}>—</span>
                      ) : isEditing ? (
                        <input type="text" placeholder="mm:ss" defaultValue={block.duracion_min?toMMSS(block.duracion_min):''} onBlur={e=>updateBlock(block.id,{duracion_min:fromMMSS(e.target.value)||0})}
                          style={{width:40,fontSize:9,padding:'2px 4px',border:`0.5px solid ${C.cremaDark}`,borderRadius:4,fontFamily:'inherit',textAlign:'center'}}/>
                      ) : (
                        <span style={{fontSize:9,fontWeight:300,color:C.muted,fontVariantNumeric:'tabular-nums'}}>{block.duracion_min?toMMSS(block.duracion_min):'—'}</span>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      {isSong ? (
                        <>
                          <select style={{...sel,fontSize:11,fontWeight:600}} value={block.song_id||''} onChange={e=>updateBlock(block.id,{song_id:e.target.value||undefined,titulo:songs.find(s=>s.id===e.target.value)?.nombre||''})}>
                            <option value="">— Seleccionar canción —</option>
                            {songs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                          </select>
                          {block.song&&(
                            <div style={{display:'flex',gap:5,marginTop:2}}>
                              {(block.song as any).link_spotify&&<a href={(block.song as any).link_spotify} target="_blank" style={{fontSize:9,color:'#2D6A4F',textDecoration:'none',fontWeight:500}}>Spotify</a>}
                              {(block.song as any).link_letras&&<a href={(block.song as any).link_letras} target="_blank" style={{fontSize:9,color:'#1971C2',textDecoration:'none',fontWeight:500}}>Letras</a>}
                              {(block.song as any).link_recursos&&<a href={(block.song as any).link_recursos} target="_blank" style={{fontSize:9,color:'#6B3FA0',textDecoration:'none',fontWeight:500}}>Recursos</a>}
                            </div>
                          )}
                        </>
                      ) : isEditing ? (
                        <input defaultValue={block.titulo||''} onBlur={e=>updateBlock(block.id,{titulo:e.target.value})}
                          style={{width:'90%',fontSize:11,padding:'3px 6px',border:`0.5px solid ${C.cremaDark}`,borderRadius:6,fontFamily:'inherit'}}/>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <span style={{fontSize:9,fontWeight:600,background:C.cremaDark,color:C.muted,padding:'1px 5px',borderRadius:3,letterSpacing:0.3}}>bloque</span>
                          <span style={{fontSize:11,fontWeight:300,color:C.muted,fontStyle:'italic'}}>{block.titulo||'—'}</span>
                        </div>
                      )}
                    </div>

                    {/* Tono */}
                    <div>
                      {isSong&&(
                        <select style={{...sel,fontSize:10}} value={block.tono||''} onChange={e=>updateBlock(block.id,{tono:e.target.value||undefined})}>
                          <option value="">—</option>
                          {NOTAS.map(n=><option key={n}>{n}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Lead */}
                    <div>
                      {isSong&&(
                        <select style={{...sel,fontSize:10}} value={block.lead_id||''} onChange={e=>updateBlock(block.id,{lead_id:e.target.value||undefined})}>
                          <option value="">— Lead —</option>
                          {members.filter(m=>m.instrumentos.includes('Voz')).map(m=>(
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{display:'flex',gap:3,justifyContent:'flex-end'}}>
                      <button onClick={()=>setEditingBlock(isEditing?null:block.id)}
                        style={{width:18,height:18,borderRadius:4,border:`0.5px solid ${C.cremaDark}`,background:isEditing?C.txt:'white',color:isEditing?C.crema:C.muted,fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {isEditing?'✓':'✏'}
                      </button>
                      <button onClick={()=>deleteBlock(block.id)}
                        style={{width:18,height:18,borderRadius:4,border:'none',background:'none',color:'#CCC',fontSize:14,cursor:'pointer',lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Footer total */}
              {blocks.length>0&&(
                <div style={{padding:'6px 14px',background:C.crema,borderTop:`0.5px solid ${C.cremaDark}`,display:'flex',justifyContent:'flex-end',alignItems:'baseline',gap:8}}>
                  <span style={{fontSize:9,fontWeight:300,color:C.muted,letterSpacing:0.5,textTransform:'uppercase'}}>Total</span>
                  <span style={{fontSize:13,fontWeight:700,color:C.txt}}>{totalToDisplay(totalSecs)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
