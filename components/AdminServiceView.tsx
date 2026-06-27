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
  const m = Math.floor(secs / 60), s = Math.round(secs % 60)
  return `${m}:${s.toString().padStart(2,'0')}`
}
function fromMMSS(val: string): number {
  if (!val) return 0
  if (val.includes(':')) { const [m,s]=val.split(':').map(Number); return (m||0)*60+(s||0) }
  return parseFloat(val)*60
}
function totalToDisplay(seconds: number): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds/60), s = Math.round(seconds%60)
  return s > 0 ? `${m}:${s.toString().padStart(2,'0')}` : `${m} min`
}

const C = { crema:'#F5F0E6', cremaDark:'#E0D8C8', txt:'#1A1A1A', muted:'#999', bg:'#FDFCF9' }

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
  fontSize:13, fontWeight:500, color:C.txt, outline:'none', cursor:'pointer',
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
  const [showNew,setShowNew]         = useState(false)
  const [newFecha,setNewFecha]       = useState('')
  const [showDup,setShowDup]         = useState(false)
  const [dupFecha,setDupFecha]       = useState('')
  const [showPresets,setShowPresets] = useState(false)
  const [editingObs,setEditingObs]   = useState<string|null>(null)
  const [obsText,setObsText]         = useState<Record<string,string>>({})

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
    onBlocksChange(); setShowPresets(false)
  }
  async function updateBlock(id:string, updates:Partial<ServiceBlock>) {
    await fetch('/api/service-blocks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...updates})})
    onBlocksChange()
  }
  async function deleteBlock(id:string) {
    await fetch('/api/service-blocks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    onBlocksChange()
  }
  function saveObs(blockId:string) {
    updateBlock(blockId,{notas:obsText[blockId]||''})
    setEditingObs(null)
  }

  const totalSecs = blocks.reduce((s,b)=>{
    const dur = b.tipo==='cancion'&&(b.song as any)?.duracion_min?(b.song as any).duracion_min:(b.duracion_min||0)
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
    const color=status==='confirmado'?'#52B788':status==='declinado'?'#E24B4A':'#F4A261'
    return <span style={{width:7,height:7,borderRadius:'50%',background:color,display:'inline-block',flexShrink:0}}/>
  }

  const input:React.CSSProperties = {border:`1px solid #C8C0B4`,borderRadius:8,padding:'7px 11px',fontSize:13,fontFamily:'inherit',outline:'none',background:'white',color:C.txt}
  const btn:React.CSSProperties   = {border:`1px solid #C8C0B4`,borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:500,fontFamily:'inherit',cursor:'pointer',background:'white',color:C.txt}
  const btnDark:React.CSSProperties = {...btn,background:C.txt,color:C.crema,border:'none'}

  // Song counter for numbering
  let songCounter = 0

  return (
    <div>
      {/* Service selector */}
      <div style={{background:'white',border:`1px solid #C8C0B4`,borderRadius:12,padding:'10px 14px',marginBottom:12,display:'flex',flexWrap:'wrap',gap:10,alignItems:'center'}}>
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
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Fecha</div>
            <input type="date" style={input} value={newFecha} onChange={e=>setNewFecha(e.target.value)}/>
          </div>
          <button style={btnDark} onClick={()=>{if(newFecha){createService(newFecha);setNewFecha('');setShowNew(false)}}}>Crear</button>
          <button style={btn} onClick={()=>setShowNew(false)}>✕</button>
        </div>
      )}
      {showDup&&selectedService&&(
        <div style={{background:'white',border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:'12px 14px',marginBottom:12,display:'flex',gap:10,alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Duplicar a fecha</div>
            <input type="date" style={input} value={dupFecha} onChange={e=>setDupFecha(e.target.value)}/>
          </div>
          <button style={btnDark} onClick={()=>{if(dupFecha){duplicateService(selectedService.id,dupFecha);setDupFecha('');setShowDup(false)}}}>Duplicar</button>
          <button style={btn} onClick={()=>setShowDup(false)}>✕</button>
        </div>
      )}

      {selectedService&&(
        <div>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
            <div>
              <h2 style={{fontSize:22,fontWeight:700,color:C.txt,letterSpacing:'-0.3px'}}>{fmtLong(selectedService.fecha)}</h2>
              <p style={{fontSize:12,fontWeight:300,color:C.muted,marginTop:2}}>{selectedService.titulo}</p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,background:'#D8F3DC',padding:'3px 10px',borderRadius:20}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#52B788',display:'inline-block'}}/>
              <span style={{fontSize:10,fontWeight:600,color:'#1B4332'}}>En vivo</span>
            </div>
          </div>

          <div className="admin-layout-grid" style={{display:'grid',gridTemplateColumns:'minmax(0,260px) 1fr',gap:12}}>

            {/* LEFT COL — Banda + Invitaciones */}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>

              {/* Banda */}
              <div style={{background:'white',border:`1px solid #C8C0B4`,borderRadius:12,overflow:'hidden'}}>
                <div style={{padding:'8px 14px',background:C.crema,borderBottom:`1px solid #C8C0B4`}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Banda</span>
                </div>
                {POSICIONES_BANDA.map(pos=>{
                  const asig=getBanda(pos), opts=membersFor(pos), status=getMemberInvStatus(asig?.member_id)
                  return(
                    <div key={pos} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',borderBottom:`0.5px solid #E8E0D0`}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.muted,width:48,flexShrink:0}}>{pos}</span>
                      <select style={sel} value={asig?.member_id||''} onChange={e=>assignBanda(pos,e.target.value)}>
                        <option value=""></option>
                        {opts.map(m=><option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                      </select>
                      {status&&statusDot(status)}
                    </div>
                  )
                })}
                <div style={{padding:'8px 14px',background:C.crema,borderTop:`1px solid #C8C0B4`,borderBottom:`1px solid #C8C0B4`}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Voces</span>
                </div>
                {POSICIONES_VX.map(pos=>{
                  const asig=getBanda(pos), opts=membersFor(pos), status=getMemberInvStatus(asig?.member_id)
                  return(
                    <div key={pos} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',borderBottom:`0.5px solid #E8E0D0`}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.muted,width:48,flexShrink:0}}>{pos}</span>
                      <select style={sel} value={asig?.member_id||''} onChange={e=>assignBanda(pos,e.target.value)}>
                        <option value=""></option>
                        {opts.map(m=><option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                      </select>
                      {status&&statusDot(status)}
                    </div>
                  )
                })}

                {/* Botón invitaciones — debajo de Voces */}
                <div style={{padding:'12px 14px',borderTop:`1px solid #C8C0B4`}}>
                  <div style={{display:'flex',gap:5,marginBottom:10}}>
                    <span style={{fontSize:9,fontWeight:700,background:'rgba(82,183,136,0.2)',color:'#1B4332',padding:'2px 7px',borderRadius:10}}>✓ {confirmed}</span>
                    <span style={{fontSize:9,fontWeight:700,background:'rgba(226,75,74,0.2)',color:'#991B1B',padding:'2px 7px',borderRadius:10}}>✗ {declined}</span>
                    <span style={{fontSize:9,fontWeight:700,background:'rgba(244,162,97,0.2)',color:'#664D03',padding:'2px 7px',borderRadius:10}}>⏳ {pending}</span>
                  </div>
                  <button onClick={sendInvites} disabled={sending}
                    style={{width:'100%',background:'#C9A14A',color:'white',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer',opacity:sending?0.6:1}}>
                    {sending?'Enviando...':`${invitations.length?'Reenviar':'Enviar'} invitaciones`}
                  </button>
                  {msg&&<p style={{fontSize:10,color:'#2D6A4F',marginTop:6,textAlign:'center'}}>{msg}</p>}
                </div>
              </div>

              {/* Equipo unificado */}
              {(()=>{
                const allPos=[...POSICIONES_BANDA,...POSICIONES_VX]
                const byMember:Record<string,{member:any,roles:string[],status:string|null}>={}
                allPos.forEach(pos=>{
                  const asig=getBanda(pos)
                  if(!asig?.member_id||!asig.member) return
                  if(!byMember[asig.member_id]) byMember[asig.member_id]={member:asig.member,roles:[],status:getMemberInvStatus(asig.member_id)}
                  byMember[asig.member_id].roles.push(pos)
                })
                const entries=Object.values(byMember)
                if(!entries.length) return null
                return(
                  <div style={{background:'white',border:`1px solid #C8C0B4`,borderRadius:12,overflow:'hidden'}}>
                    <div style={{padding:'8px 14px',background:C.crema,borderBottom:`1px solid #C8C0B4`}}>
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Equipo del domingo</span>
                    </div>
                    <div style={{padding:'8px'}}>
                      {entries.map(({member,roles,status})=>(
                        <div key={member.id} style={{display:'flex',alignItems:'center',gap:8,background:C.bg,borderRadius:8,padding:'6px 10px',marginBottom:4}}>
                          <div style={{width:30,height:30,borderRadius:'50%',background:C.txt,color:C.crema,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>
                            {member.nombre?.[0]}{member.apellido?.[0]||''}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:C.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{member.nombre} {member.apellido}</div>
                            <div style={{display:'flex',gap:2,flexWrap:'wrap',marginTop:2}}>
                              {roles.map(r=><span key={r} style={{fontSize:8,fontWeight:700,background:'rgba(0,0,0,0.07)',color:C.txt,padding:'1px 4px',borderRadius:3}}>{r}</span>)}
                            </div>
                          </div>
                          {status==='confirmado'&&<span style={{fontSize:9,background:'#D8F3DC',color:'#1B4332',padding:'1px 6px',borderRadius:10,fontWeight:700}}>✓</span>}
                          {status==='declinado' &&<span style={{fontSize:9,background:'#FEE2E2',color:'#991B1B',padding:'1px 6px',borderRadius:10,fontWeight:700}}>✗</span>}
                          {status==='pendiente' &&<span style={{fontSize:9,background:'#FFF3CD',color:'#664D03',padding:'1px 6px',borderRadius:10,fontWeight:700}}>⏳</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Respuestas */}
              {invitations.length>0&&(
                <div style={{background:'white',border:`1px solid #C8C0B4`,borderRadius:12,overflow:'hidden'}}>
                  <div style={{padding:'8px 14px',background:C.crema,borderBottom:`1px solid #C8C0B4`}}>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Respuestas</span>
                  </div>
                  <div style={{padding:'4px 0'}}>
                    {invitations.map(inv=>(
                      <div key={inv.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px',borderBottom:`0.5px solid #E8E0D0`}}>
                        {statusDot(inv.status)}
                        <span style={{fontSize:12,fontWeight:500,color:C.txt,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inv.member?.nombre} {inv.member?.apellido}</span>
                        {inv.comentario&&<span style={{fontSize:10,fontWeight:300,color:C.muted,fontStyle:'italic',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>"{inv.comentario}"</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Order of service */}
            <div style={{background:'white',border:`1px solid #C8C0B4`,borderRadius:12,overflow:'hidden'}}>
              {/* Header */}
              <div style={{padding:'10px 16px',borderBottom:`1px solid #C8C0B4`,display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.txt}}>Orden del servicio</span>
                  <span style={{fontSize:11,fontWeight:300,color:C.muted,marginLeft:8}}>{blocks.length} items · {totalToDisplay(totalSecs)}</span>
                </div>
                <div style={{display:'flex',gap:6,position:'relative'}}>
                  <div style={{position:'relative'}}>
                    <button style={btn} onClick={()=>setShowPresets(v=>!v)}>+ Bloque ▾</button>
                    {showPresets&&(
                      <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:'white',border:`1px solid #C8C0B4`,borderRadius:10,boxShadow:'0 4px 16px rgba(0,0,0,0.08)',zIndex:20,width:190,padding:'4px 0'}}>
                        {BLOQUES_PRESET.map(b=>(
                          <button key={b.titulo} onClick={()=>addBlock('bloque',b)}
                            style={{width:'100%',textAlign:'left',padding:'8px 16px',fontSize:12,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:C.txt,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            {b.titulo}<span style={{fontSize:10,color:C.muted}}>{toMMSS(b.duracion_min)}</span>
                          </button>
                        ))}
                        <div style={{borderTop:`1px solid #C8C0B4`,margin:'2px 0'}}/>
                        <button onClick={()=>addBlock('bloque')} style={{width:'100%',textAlign:'left',padding:'8px 16px',fontSize:12,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:C.muted}}>
                          + Personalizado
                        </button>
                      </div>
                    )}
                  </div>
                  <button style={btnDark} onClick={()=>addBlock('cancion')}>🎵 + Canción</button>
                </div>
              </div>

              {/* Column headers */}
              <div className="desktop-cols-header" style={{display:'grid',gridTemplateColumns:'52px 1fr 80px 110px 36px',padding:'5px 16px',background:C.crema,borderBottom:`1px solid #C8C0B4`}}>
                {['Min','Título','Tono','Lead / Voz',''].map((h,i)=>(
                  <span key={i} style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.muted}}>{h}</span>
                ))}
              </div>
              <div className="mobile-cols-header" style={{display:'none',padding:'5px 14px',background:C.crema,borderBottom:`1px solid #C8C0B4`}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.muted}}>Canciones</span>
              </div>

              {blocks.length===0&&(
                <div style={{padding:'48px',textAlign:'center',color:C.muted,fontSize:13,fontWeight:300}}>
                  Sin items. Agrega una canción o bloque.
                </div>
              )}

              {blocks.map(block=>{
                const isSong = block.tipo==='cancion'
                const songDur = (block.song as any)?.duracion_min
                if(isSong) songCounter++
                const currentNum = isSong ? songCounter : null
                const blockObs = (block as any).notas || ''

                return(
                  <div key={block.id}>
                    <div className="order-row-desktop" style={{display:'grid',gridTemplateColumns:'52px 1fr 80px 110px 36px',padding:'7px 16px',borderBottom:`0.5px solid #E8E0D0`,alignItems:'center',background:isSong?'white':C.bg}}>

                      {/* Min */}
                      <div>
                        {isSong && songDur ? (
                          <span style={{fontSize:11,fontWeight:500,background:'rgba(0,0,0,0.06)',color:C.txt,padding:'2px 6px',borderRadius:4,fontVariantNumeric:'tabular-nums'}}>{toMMSS(songDur)}</span>
                        ) : isSong ? (
                          <span style={{fontSize:11,fontWeight:300,color:'#CCC'}}>—</span>
                        ) : (
                          <span style={{fontSize:11,fontWeight:300,color:C.muted,fontVariantNumeric:'tabular-nums'}}>{block.duracion_min?toMMSS(block.duracion_min):'—'}</span>
                        )}
                      </div>

                      {/* Título + número + observación inline */}
                      <div style={{minWidth:0,paddingRight:8}}>
                        {isSong ? (
                          <div>
                            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:2}}>
                              {/* Número de canción */}
                              {currentNum&&(
                                <span style={{width:20,height:20,borderRadius:'50%',background:C.txt,color:C.crema,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>
                                  {currentNum}
                                </span>
                              )}
                              <select style={{...sel,fontSize:13,fontWeight:600}} value={block.song_id||''} onChange={e=>updateBlock(block.id,{song_id:e.target.value||undefined,titulo:songs.find(s=>s.id===e.target.value)?.nombre||''})}>
                                <option value="">— Seleccionar canción —</option>
                                {songs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                              </select>
                              {/* Obs button */}
                              <button onClick={()=>{
                                if(editingObs===block.id){saveObs(block.id)}
                                else{setEditingObs(block.id);setObsText(prev=>({...prev,[block.id]:blockObs}))}
                              }} title="Observación" style={{width:22,height:22,borderRadius:5,border:`1px solid #C8C0B4`,background:blockObs?'#FFF3CD':'white',color:blockObs?'#92400E':C.muted,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                {editingObs===block.id?'✓':'📝'}
                              </button>
                            </div>
                            {/* Links */}
                            {block.song&&(
                              <div style={{display:'flex',gap:4,marginLeft:27,marginTop:2}}>
                                {(block.song as any).link_spotify&&<a href={(block.song as any).link_spotify} target="_blank" style={{width:20,height:20,background:'#D8F3DC',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,textDecoration:'none'}}>🎧</a>}
                                {(block.song as any).link_letras&&<a href={(block.song as any).link_letras} target="_blank" style={{width:20,height:20,background:'#DBE4FF',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,textDecoration:'none'}}>📄</a>}
                                {(block.song as any).link_recursos&&<a href={(block.song as any).link_recursos} target="_blank" style={{width:20,height:20,background:'#FFF3CD',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,textDecoration:'none'}}>📁</a>}
                              </div>
                            )}
                            {/* Obs input inline */}
                            {editingObs===block.id&&(
                              <div style={{marginTop:6,marginLeft:27}}>
                                <input autoFocus placeholder="Escribe una observación..." value={obsText[block.id]||''}
                                  onChange={e=>setObsText(prev=>({...prev,[block.id]:e.target.value}))}
                                  onKeyDown={e=>{if(e.key==='Enter')saveObs(block.id);if(e.key==='Escape')setEditingObs(null)}}
                                  style={{width:'100%',fontSize:12,padding:'5px 8px',border:`0.5px solid #C9A14A`,borderRadius:6,fontFamily:'inherit',outline:'none',color:C.txt,background:'#FFFBEB'}}/>
                              </div>
                            )}
                            {/* Obs display */}
                            {blockObs&&editingObs!==block.id&&(
                              <div style={{marginTop:4,marginLeft:27,display:'flex',alignItems:'center',gap:4}}>
                                <span style={{fontSize:11,color:'#92400E',fontWeight:400,fontStyle:'italic'}}>📝 {blockObs}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize:11,fontWeight:600,background:C.cremaDark,color:C.muted,padding:'1px 6px',borderRadius:3,letterSpacing:0.3,flexShrink:0}}>bloque</span>
                            <input defaultValue={block.titulo||''} onBlur={e=>updateBlock(block.id,{titulo:e.target.value})}
                              style={{flex:1,fontSize:13,fontWeight:300,color:C.muted,fontStyle:'italic',border:'none',outline:'none',background:'transparent',fontFamily:'inherit'}}/>
                            {/* Duration editable for blocks */}
                            <input type="text" placeholder="mm:ss" defaultValue={block.duracion_min?toMMSS(block.duracion_min):''}
                              onBlur={e=>updateBlock(block.id,{duracion_min:fromMMSS(e.target.value)||0})}
                              style={{width:44,fontSize:10,padding:'2px 4px',border:`1px solid #C8C0B4`,borderRadius:4,fontFamily:'inherit',textAlign:'center',color:C.muted}}/>
                          </div>
                        )}
                      </div>

                      {/* Tono */}
                      <div>
                        {isSong&&(
                          <select style={{...sel,fontSize:12}} value={block.tono||''} onChange={e=>updateBlock(block.id,{tono:e.target.value||undefined})}>
                            <option value="">—</option>
                            {NOTAS.map(n=><option key={n}>{n}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Lead */}
                      <div>
                        {isSong&&(
                          <select style={{...sel,fontSize:12}} value={block.lead_id||''} onChange={e=>updateBlock(block.id,{lead_id:e.target.value||undefined})}>
                            <option value="">— Lead —</option>
                            {members.filter(m=>m.instrumentos.includes('Voz')).map(m=>(
                              <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* ✕ Delete — más visible */}
                      <div style={{display:'flex',justifyContent:'center'}}>
                        <button onClick={()=>deleteBlock(block.id)}
                          style={{width:24,height:24,borderRadius:6,border:'none',background:'#FEE2E2',color:'#B91C1C',fontSize:14,cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Footer */}
              {blocks.length>0&&(
                <div style={{padding:'7px 16px',background:C.crema,borderTop:`1px solid #C8C0B4`,display:'flex',justifyContent:'flex-end',alignItems:'baseline',gap:8}}>
                  <span style={{fontSize:11,fontWeight:300,color:C.muted,letterSpacing:0.5,textTransform:'uppercase'}}>Total</span>
                  <span style={{fontSize:15,fontWeight:700,color:C.txt}}>{totalToDisplay(totalSecs)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
