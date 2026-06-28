'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AvatarUpload from '@/components/AvatarUpload'
import TexBg from '@/components/TexBg'

interface Song { id:string;nombre:string;artista:string;tono_original?:string;bpm?:number;compas?:string;link_spotify?:string;link_letras?:string;link_recursos?:string;duracion_min?:number;notas?:string }
interface SetlistItem { orden:number;tono?:string;titulo?:string;tipo?:string;duracion_min?:number;song?:Song;lead?:{nombre:string} }
interface BandaItem { posicion:string;member?:{nombre:string} }
interface ServiceData { service:{id:string;fecha:string;titulo:string};posiciones:string[];invitation:{status:string;comentario?:string;token:string}|null;setlist:SetlistItem[];banda:BandaItem[] }
interface Member { id:string;nombre:string;apellido:string;email:string;telefono?:string;avatar_url?:string }

const C = { crema:'#F5F0E6', cremaDark:'#E0D8C8', txt:'#1A1A1A', muted:'#999' }
type Tab = 'home'|'recursos'|'perfil'

function toMMSS(secs:number):string {
  const m=Math.floor(secs/60),s=Math.round(secs%60)
  return `${m}:${s.toString().padStart(2,'0')}`
}

// Logo Áncora SVG inline — versión blanca para fondo oscuro
function LogoAncora() {
  return (
    <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',background:'#1A1A1A',borderRadius:12,padding:'10px 20px',marginBottom:20}}>
      <div style={{fontFamily:'"Dancing Script",cursive',fontWeight:700,fontSize:34,color:'#F5F0E6',lineHeight:1}}>Áncora</div>
      <div style={{width:32,height:0.5,background:'rgba(245,240,230,0.35)',margin:'4px 0'}}/>
      <div style={{fontFamily:'"Helvetica Neue",Helvetica,sans-serif',fontWeight:400,fontSize:9,letterSpacing:5,textTransform:'uppercase' as const,color:'rgba(245,240,230,0.75)'}}>Worship</div>
    </div>
  )
}

export default function PortalPage() {
  const { token } = useParams<{ token:string }>()
  const [member, setMember]     = useState<Member|null>(null)
  const [services, setServices] = useState<ServiceData[]>([])
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab]           = useState<Tab>('home')
  const [expandedSvc, setExpandedSvc] = useState<string|null>(null)
  const [expandedSong, setExpandedSong] = useState<string|null>(null)
  const [expandedSetlistItem, setExpandedSetlistItem] = useState<string|null>(null)
  const [confirmingDecline, setConfirmingDecline] = useState<string|null>(null)
  const [obsComment, setObsComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [editProfile, setEditProfile] = useState(false)
  const [profileData, setProfileData] = useState({nombre:'',apellido:'',telefono:''})
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [songSearch, setSongSearch] = useState('')

  const loadData = useCallback(async () => {
    const [portalRes, songsRes] = await Promise.all([
      fetch(`/api/member-portal?token=${token}`),
      fetch('/api/all-songs'),
    ])
    if (!portalRes.ok) { setNotFound(true); setLoading(false); return }
    const data = await portalRes.json()
    const songsData = songsRes.ok ? await songsRes.json() : { songs:[] }
    setMember(data.member)
    setServices(data.services)
    setAllSongs(songsData.songs||[])
    setProfileData({nombre:data.member.nombre,apellido:data.member.apellido||'',telefono:data.member.telefono||''})
    if (data.services.length>0) setExpandedSvc(prev=>prev||data.services[0].service.id)
    setLoading(false)
  }, [token])

  useEffect(()=>{
    loadData()
    const channel = supabase.channel('portal-realtime')
      .on('postgres_changes',{event:'*',schema:'public',table:'service_blocks'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'banda_assignments'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'songs'},()=>loadData())
      .subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[loadData])

  function fmtFecha(fecha:string) {
    const d=new Date(fecha+'T12:00:00')
    const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return { dia:dias[d.getDay()], fecha:`${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}` }
  }

  function daysUntil(fecha:string) {
    const today=new Date(); today.setHours(0,0,0,0)
    const svcDate=new Date(fecha+'T12:00:00'); svcDate.setHours(0,0,0,0)
    return Math.round((svcDate.getTime()-today.getTime())/(1000*60*60*24))
  }

  async function saveProfile() {
    setSavingProfile(true)
    const res=await fetch('/api/member-portal',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,...profileData})})
    if(res.ok){setMember(prev=>prev?{...prev,...profileData}:prev);setProfileMsg('¡Guardado!');setEditProfile(false);setTimeout(()=>setProfileMsg(''),3000)}
    setSavingProfile(false)
  }

  async function handleRSVP(invToken: string, respuesta: 'si'|'no', comentario?: string) {
    setActionLoading(true)
    await fetch(`/api/confirm-rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:invToken,respuesta,comentario})})
    await loadData()
    setConfirmingDecline(null)
    setObsComment('')
    setActionLoading(false)
  }

  const nextService = services[0]||null
  const filteredSongs = allSongs.filter(s=>s.nombre.toLowerCase().includes(songSearch.toLowerCase())||s.artista.toLowerCase().includes(songSearch.toLowerCase()))

  if (loading) return (
    <TexBg className="min-h-screen flex items-center justify-center">
      <div style={{textAlign:'center'}}>
        <div style={{width:32,height:32,border:'2px solid #F5F0E6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 10px'}}/>
        <p style={{color:'rgba(245,240,230,0.5)',fontSize:13,fontWeight:300}}>Cargando tu portal...</p>
      </div>
    </TexBg>
  )

  if (notFound) return (
    <div style={{minHeight:'100vh',background:'#F8F5EF',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'white',borderRadius:16,padding:32,textAlign:'center',maxWidth:320,border:`0.5px solid ${C.cremaDark}`}}>
        <p style={{fontSize:40,marginBottom:12}}>🤔</p>
        <h2 style={{fontSize:18,fontWeight:700,color:C.txt,marginBottom:6}}>Portal no encontrado</h2>
        <p style={{fontSize:14,fontWeight:400,color:C.muted}}>Este link no es válido o expiró.</p>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:C.crema,fontFamily:'"Helvetica Neue",Helvetica,Arial,sans-serif'}}>

      {/* ── HERO ── */}
      <TexBg className="pt-8 pb-20 px-5">
        <div style={{maxWidth:500,margin:'0 auto'}}>

          {/* Logo Áncora Worship */}
          <LogoAncora />

          {/* Avatar + nombre */}
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
            <div style={{width:52,height:52,borderRadius:12,background:C.crema,overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid rgba(245,240,230,0.3)'}}>
              {member?.avatar_url
                ? <img src={member.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={member.nombre}/>
                : <span style={{fontFamily:'"Dancing Script",cursive',fontWeight:700,fontSize:28,color:C.txt,lineHeight:1}}>{member?.nombre[0]}</span>
              }
            </div>
            <div>
              <h1 style={{fontSize:22,fontWeight:700,color:'#F5F0E6',lineHeight:1.2}}>Hola, {member?.nombre}</h1>
              <p style={{fontSize:12,fontWeight:400,color:'rgba(245,240,230,0.55)',marginTop:3}}>Portal del músico</p>
            </div>
          </div>

          {/* Card próximo servicio */}
          {nextService&&(()=>{
            const {dia,fecha}=fmtFecha(nextService.service.fecha)
            const days=daysUntil(nextService.service.fecha)
            return(
              <div style={{background:'rgba(255,255,255,0.78)',border:'0.5px solid rgba(255,255,255,0.6)',borderRadius:14,padding:'14px 16px'}}>
                <p style={{fontSize:9,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase' as const,color:'#888',marginBottom:6}}>Próximo servicio</p>
                <p style={{fontSize:18,fontWeight:700,color:C.txt,marginBottom:8,letterSpacing:'-0.3px'}}>{dia} {fecha}</p>
                <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap' as const}}>
                  {nextService.posiciones.map(p=>(
                    <span key={p} style={{fontSize:10,fontWeight:700,background:'rgba(26,26,26,0.1)',color:C.txt,padding:'3px 8px',borderRadius:5,border:'0.5px solid rgba(26,26,26,0.15)'}}>{p}</span>
                  ))}
                  {nextService.invitation&&(
                    <span style={{fontSize:10,fontWeight:600,background:nextService.invitation.status==='confirmado'?'#D8F3DC':'#FFF3CD',color:nextService.invitation.status==='confirmado'?'#1B4332':'#664D03',padding:'3px 8px',borderRadius:5}}>
                      {nextService.invitation.status==='confirmado'?'✓ Confirmado':'⏳ Pendiente'}
                    </span>
                  )}
                  <span style={{fontSize:10,fontWeight:600,background:'#FFF3CD',color:'#664D03',padding:'3px 10px',borderRadius:20,marginLeft:'auto'}}>
                    {days===0?'¡Hoy!':days===1?'Mañana':`En ${days} días`}
                  </span>
                </div>
              </div>
            )
          })()}
        </div>
      </TexBg>

      {/* ── TAB BAR ── */}
      <div style={{maxWidth:500,margin:'-1px auto 0',padding:'0 16px'}}>
        <div style={{background:'white',borderRadius:14,padding:'4px',display:'flex',boxShadow:'0 2px 12px rgba(0,0,0,0.08)',position:'relative',top:-20}}>
          {(['home','recursos','perfil'] as Tab[]).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{flex:1,padding:'9px 4px',borderRadius:10,fontSize:14,fontWeight:tab===t?700:500,color:tab===t?'white':C.muted,background:tab===t?C.txt:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>
              {t==='home'?'🏠 Inicio':t==='recursos'?'🎵 Canciones':'👤 Perfil'}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{maxWidth:500,margin:'0 auto',padding:'0 16px 40px'}}>

        {/* HOME */}
        {tab==='home'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {services.length===0&&(
              <div style={{background:'white',borderRadius:14,padding:32,textAlign:'center',border:`0.5px solid ${C.cremaDark}`}}>
                <p style={{fontSize:32,marginBottom:8}}>🎶</p>
                <p style={{fontSize:14,fontWeight:400,color:C.muted}}>No tienes servicios próximos asignados.</p>
              </div>
            )}
            {services.map(({service,posiciones,invitation,setlist,banda})=>{
              const isOpen=expandedSvc===service.id
              const {dia,fecha}=fmtFecha(service.fecha)
              const days=daysUntil(service.fecha)
              return(
                <div key={service.id} style={{background:'white',borderRadius:14,overflow:'hidden',border:`0.5px solid ${C.cremaDark}`}}>
                  {/* Header row */}
                  <button onClick={()=>setExpandedSvc(isOpen?null:service.id)}
                    style={{width:'100%',textAlign:'left',padding:'14px 16px',display:'flex',alignItems:'center',gap:12,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                    <div style={{width:40,height:40,background:C.crema,borderRadius:10,border:`0.5px solid ${C.cremaDark}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:16,fontWeight:700,color:C.txt,lineHeight:1}}>{new Date(service.fecha+'T12:00:00').getDate()}</span>
                      <span style={{fontSize:8,fontWeight:500,color:C.muted,textTransform:'uppercase' as const}}>{fecha.split(' ')[1]}</span>
                    </div>
                    <div style={{flex:1}}>
                      <p style={{fontSize:16,fontWeight:700,color:C.txt}}>{dia}, {fecha}</p>
                      <div style={{display:'flex',gap:5,marginTop:5,flexWrap:'wrap' as const}}>
                        {posiciones.map(p=><span key={p} style={{fontSize:10,fontWeight:700,background:C.txt,color:C.crema,padding:'2px 6px',borderRadius:4}}>{p}</span>)}
                        {invitation&&(
                          <span style={{fontSize:10,fontWeight:600,background:invitation.status==='confirmado'?'#D8F3DC':invitation.status==='declinado'?'#FEE2E2':'#FFF3CD',color:invitation.status==='confirmado'?'#1B4332':invitation.status==='declinado'?'#991B1B':'#664D03',padding:'2px 6px',borderRadius:4}}>
                            {invitation.status==='confirmado'?'✓ Confirmado':invitation.status==='declinado'?'✗ Declinado':'⏳ Pendiente'}
                          </span>
                        )}
                        <span style={{fontSize:10,fontWeight:400,color:C.muted}}>{days===0?'¡Hoy!':days===1?'Mañana':`${days} días`}</span>
                      </div>
                    </div>
                    <span style={{color:C.muted,fontSize:13,transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
                  </button>

                  {isOpen&&(
                    <div style={{borderTop:`0.5px solid ${C.crema}`}}>

                      {/* RSVP */}
                      {invitation&&(
                        <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${C.crema}`,background:invitation.status==='pendiente'?'#FFFBEB':invitation.status==='confirmado'?'#F0FFF4':'#FFF5F5'}}>
                          {confirmingDecline===service.id ? (
                            <div>
                              <p style={{fontSize:13,fontWeight:600,color:'#B91C1C',marginBottom:8}}>¿Seguro que no puedes asistir?</p>
                              <input placeholder="Motivo (obligatorio) *" value={obsComment} onChange={e=>setObsComment(e.target.value)}
                                style={{width:'100%',fontSize:13,padding:'8px 10px',border:'0.5px solid #FCA5A5',borderRadius:8,marginBottom:8,fontFamily:'inherit',outline:'none'}}/>
                              <div style={{display:'flex',gap:8}}>
                                <button onClick={()=>handleRSVP(invitation.token,'no',obsComment)} disabled={actionLoading||!obsComment.trim()}
                                  style={{flex:1,background:obsComment.trim()?'#B91C1C':'#CCC',color:'white',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:obsComment.trim()?'pointer':'default'}}>
                                  {actionLoading?'...':'Sí, no puedo'}
                                </button>
                                <button onClick={()=>setConfirmingDecline(null)}
                                  style={{flex:1,background:'white',color:C.txt,border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'10px',fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:invitation.status==='pendiente'?10:0}}>
                                <span style={{fontSize:14,fontWeight:700,color:invitation.status==='confirmado'?'#1B4332':invitation.status==='declinado'?'#991B1B':'#92400E'}}>
                                  {invitation.status==='confirmado'?'✓ Confirmado':invitation.status==='declinado'?'✗ Declinado':'¿Puedes asistir?'}
                                </span>
                                {invitation.status!=='pendiente'&&(
                                  <button onClick={()=>setConfirmingDecline(null)}
                                    style={{fontSize:12,color:C.muted,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>
                                    Cambiar
                                  </button>
                                )}
                              </div>
                              {invitation.status==='pendiente'&&(
                                <div style={{display:'flex',gap:8}}>
                                  <button onClick={()=>handleRSVP(invitation.token,'si')} disabled={actionLoading}
                                    style={{flex:1,background:C.txt,color:C.crema,border:'none',borderRadius:10,padding:'12px',fontSize:14,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>
                                    {actionLoading?'...':'✓ Confirmo'}
                                  </button>
                                  <button onClick={()=>setConfirmingDecline(service.id)}
                                    style={{flex:1,background:'white',color:'#B91C1C',border:'0.5px solid #FCA5A5',borderRadius:10,padding:'12px',fontSize:14,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>
                                    ✗ No puedo
                                  </button>
                                </div>
                              )}
                              {invitation.status==='confirmado'&&(
                                <button onClick={()=>setConfirmingDecline(service.id)}
                                  style={{fontSize:12,color:C.muted,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textDecoration:'underline',display:'block',marginTop:4}}>
                                  ¿Ya no puedes? Declinar
                                </button>
                              )}
                              {invitation.status==='declinado'&&(
                                <button onClick={()=>handleRSVP(invitation.token,'si')} disabled={actionLoading}
                                  style={{marginTop:8,width:'100%',background:C.txt,color:C.crema,border:'none',borderRadius:10,padding:'10px',fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>
                                  {actionLoading?'...':'✓ Confirmar asistencia'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Banda del día */}
                      <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.crema}`}}>
                        <p style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase' as const,color:C.muted,marginBottom:10}}>Banda del día</p>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                          {['AG1','AG2','EG','KEYS','BASS','DRUMS','MD','SONIDO','VX1','VX2','VX3','VX4'].map(pos=>{
                            const b=banda.find(x=>x.posicion===pos)
                            if(!b?.member) return null
                            const isMe=b.member.nombre===member?.nombre
                            return(
                              <div key={pos} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:isMe?C.txt:C.crema}}>
                                <span style={{fontSize:9,fontWeight:700,color:isMe?'#C9A14A':C.muted,width:32,flexShrink:0}}>{pos}</span>
                                <span style={{fontSize:13,fontWeight:500,color:isMe?'white':C.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{b.member.nombre}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* ── SETLIST — expandible por canción ── */}
                      {setlist.length>0&&(
                        <div style={{padding:'14px 16px'}}>
                          <p style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase' as const,color:C.muted,marginBottom:10}}>Setlist</p>
                          <div style={{display:'flex',flexDirection:'column',gap:6}}>
                            {setlist.map((item,idx)=>{
                              const isSong = item.tipo==='cancion'||!item.tipo
                              const itemKey = `${service.id}-${idx}`
                              const isItemOpen = expandedSetlistItem===itemKey
                              const hasLinks = item.song?.link_spotify||item.song?.link_letras||item.song?.link_recursos
                              return(
                                <div key={idx} style={{background:isSong?C.crema:'rgba(0,0,0,0.04)',borderRadius:10,overflow:'hidden'}}>
                                  {/* Fila principal — siempre visible */}
                                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}}>
                                    <span style={{width:22,height:22,borderRadius:'50%',background:isSong?C.txt:'#CCC',color:C.crema,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>
                                      {item.orden}
                                    </span>
                                    <div style={{flex:1,minWidth:0}}>
                                      <p style={{fontSize:15,fontWeight:700,color:C.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>
                                        {item.song?.nombre||item.titulo||'—'}
                                      </p>
                                      {isSong&&(
                                        <p style={{fontSize:12,fontWeight:400,color:C.muted,marginTop:2}}>
                                          {[item.song?.artista,item.tono,item.song?.bpm?`${item.song.bpm} BPM`:null,item.song?.duracion_min?toMMSS(item.song.duracion_min):null].filter(Boolean).join(' · ')}
                                        </p>
                                      )}
                                    </div>
                                    {/* Lead badge */}
                                    {item.lead&&(
                                      <span style={{fontSize:11,fontWeight:600,background:'rgba(201,161,74,0.18)',color:'#92400E',padding:'3px 8px',borderRadius:10,flexShrink:0,whiteSpace:'nowrap' as const}}>
                                        Lead: {item.lead.nombre}
                                      </span>
                                    )}
                                    {/* Flecha expandir — solo si tiene links */}
                                    {isSong&&hasLinks&&(
                                      <button onClick={()=>setExpandedSetlistItem(isItemOpen?null:itemKey)}
                                        style={{width:26,height:26,borderRadius:6,background:'rgba(0,0,0,0.07)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'transform 0.2s',transform:isItemOpen?'rotate(180deg)':'none'}}>
                                        <span style={{fontSize:12,color:C.muted,lineHeight:1}}>▼</span>
                                      </button>
                                    )}
                                  </div>
                                  {/* Links expandibles */}
                                  {isSong&&hasLinks&&isItemOpen&&(
                                    <div style={{padding:'0 12px 12px',display:'flex',gap:8}}>
                                      {item.song?.link_spotify&&(
                                        <a href={item.song.link_spotify} target="_blank"
                                          style={{flex:1,background:'#D8F3DC',borderRadius:10,padding:'10px 4px',textAlign:'center' as const,textDecoration:'none',display:'block'}}>
                                          <div style={{fontSize:22,marginBottom:3}}>🎧</div>
                                          <span style={{fontSize:10,fontWeight:700,color:'#1B4332'}}>Spotify</span>
                                        </a>
                                      )}
                                      {item.song?.link_letras&&(
                                        <a href={item.song.link_letras} target="_blank"
                                          style={{flex:1,background:'#DBE4FF',borderRadius:10,padding:'10px 4px',textAlign:'center' as const,textDecoration:'none',display:'block'}}>
                                          <div style={{fontSize:22,marginBottom:3}}>📄</div>
                                          <span style={{fontSize:10,fontWeight:700,color:'#1971C2'}}>Letras</span>
                                        </a>
                                      )}
                                      {item.song?.link_recursos&&(
                                        <a href={item.song.link_recursos} target="_blank"
                                          style={{flex:1,background:'#FFF3CD',borderRadius:10,padding:'10px 4px',textAlign:'center' as const,textDecoration:'none',display:'block'}}>
                                          <div style={{fontSize:22,marginBottom:3}}>📁</div>
                                          <span style={{fontSize:10,fontWeight:700,color:'#92400E'}}>Recursos</span>
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
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

        {/* RECURSOS / CANCIONES */}
        {tab==='recursos'&&(
          <div>
            <div style={{background:'white',borderRadius:10,padding:'10px 12px',marginBottom:10,border:`0.5px solid ${C.cremaDark}`,display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:16}}>🔍</span>
              <input style={{flex:1,border:'none',outline:'none',fontSize:14,fontFamily:'inherit',fontWeight:400,color:C.txt,background:'transparent'}} placeholder="Buscar canción o artista..." value={songSearch} onChange={e=>setSongSearch(e.target.value)}/>
            </div>
            <p style={{fontSize:12,fontWeight:400,color:C.muted,textAlign:'center' as const,marginBottom:10}}>{filteredSongs.length} canción{filteredSongs.length!==1?'es':''} en el repertorio</p>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {filteredSongs.map(song=>{
                const isOpen=expandedSong===song.id
                return(
                  <div key={song.id} style={{background:'white',borderRadius:12,overflow:'hidden',border:`0.5px solid ${C.cremaDark}`}}>
                    <button onClick={()=>setExpandedSong(isOpen?null:song.id)}
                      style={{width:'100%',textAlign:'left' as const,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                      <div style={{width:38,height:38,borderRadius:9,background:C.txt,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18}}>🎵</div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:15,fontWeight:700,color:C.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{song.nombre}</p>
                        <p style={{fontSize:12,fontWeight:400,color:C.muted,marginTop:2}}>{song.artista}</p>
                        <div style={{display:'flex',gap:4,marginTop:5,flexWrap:'wrap' as const}}>
                          {song.tono_original&&<span style={{fontSize:10,fontWeight:700,background:'rgba(0,0,0,0.07)',color:C.txt,padding:'2px 6px',borderRadius:10}}>{song.tono_original}</span>}
                          {song.bpm&&<span style={{fontSize:10,background:'rgba(201,161,74,0.15)',color:'#92400E',padding:'2px 6px',borderRadius:10}}>♩{song.bpm}</span>}
                          {song.compas&&<span style={{fontSize:10,background:C.crema,color:C.muted,padding:'2px 6px',borderRadius:10}}>{song.compas}</span>}
                          {song.duracion_min&&<span style={{fontSize:10,background:C.crema,color:C.muted,padding:'2px 6px',borderRadius:10}}>{toMMSS(song.duracion_min)}</span>}
                        </div>
                      </div>
                      <span style={{color:C.muted,fontSize:12,transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
                    </button>
                    {isOpen&&(
                      <div style={{borderTop:`0.5px solid ${C.crema}`,padding:'12px 14px'}}>
                        {song.notas&&<div style={{background:'#FFFBEB',borderRadius:8,padding:'8px 10px',marginBottom:10}}><p style={{fontSize:10,color:'#92400E',fontWeight:600,marginBottom:3}}>📝 Notas</p><p style={{fontSize:12,color:'#92400E',fontWeight:400}}>{song.notas}</p></div>}
                        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                          {song.link_spotify&&<a href={song.link_spotify} target="_blank" style={{background:'#D8F3DC',borderRadius:10,padding:'12px 4px',textAlign:'center' as const,textDecoration:'none',display:'block'}}><div style={{fontSize:24,marginBottom:4}}>🎧</div><span style={{fontSize:11,fontWeight:700,color:'#1B4332'}}>Spotify</span></a>}
                          {song.link_letras&&<a href={song.link_letras} target="_blank" style={{background:'#DBE4FF',borderRadius:10,padding:'12px 4px',textAlign:'center' as const,textDecoration:'none',display:'block'}}><div style={{fontSize:24,marginBottom:4}}>📄</div><span style={{fontSize:11,fontWeight:700,color:'#1971C2'}}>Letras</span></a>}
                          {song.link_recursos&&<a href={song.link_recursos} target="_blank" style={{background:'#FFF3CD',borderRadius:10,padding:'12px 4px',textAlign:'center' as const,textDecoration:'none',display:'block'}}><div style={{fontSize:24,marginBottom:4}}>📁</div><span style={{fontSize:11,fontWeight:700,color:'#92400E'}}>Recursos</span></a>}
                        </div>
                        {!song.link_spotify&&!song.link_letras&&!song.link_recursos&&<p style={{fontSize:12,fontWeight:400,color:C.muted,textAlign:'center' as const,padding:'8px 0'}}>Sin links disponibles</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PERFIL */}
        {tab==='perfil'&&(
          <div>
            <div style={{background:'white',borderRadius:14,overflow:'hidden',border:`0.5px solid ${C.cremaDark}`}}>
              <TexBg className="p-5 flex items-center gap-4">
                <AvatarUpload memberId={member?.id||''} currentUrl={member?.avatar_url} nombre={member?.nombre||''} apellido={member?.apellido} size="lg"
                  onUpdate={url=>setMember(prev=>prev?{...prev,avatar_url:url}:prev)}/>
                <div>
                  <p style={{fontSize:18,fontWeight:700,color:'#F5F0E6'}}>{member?.nombre} {member?.apellido}</p>
                  <p style={{fontSize:12,fontWeight:400,color:'rgba(245,240,230,0.6)'}}>{member?.email}</p>
                </div>
              </TexBg>
              <div style={{padding:'16px'}}>
                {profileMsg&&<div style={{background:'#D8F3DC',color:'#1B4332',fontSize:13,padding:'8px 12px',borderRadius:8,marginBottom:12,fontWeight:500}}>{profileMsg}</div>}
                {editProfile?(
                  <div>
                    {[{label:'Nombre',key:'nombre'},{label:'Apellido',key:'apellido'},{label:'Teléfono',key:'telefono'}].map(({label,key})=>(
                      <div key={key} style={{marginBottom:10}}>
                        <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:4,textTransform:'uppercase' as const,letterSpacing:0.5}}>{label}</label>
                        <input style={{width:'100%',border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:14,fontFamily:'inherit',outline:'none',color:C.txt}}
                          value={(profileData as any)[key]} onChange={e=>setProfileData({...profileData,[key]:e.target.value})}/>
                      </div>
                    ))}
                    <div style={{display:'flex',gap:8,marginTop:4}}>
                      <button onClick={saveProfile} disabled={savingProfile}
                        style={{flex:1,background:C.txt,color:C.crema,border:'none',borderRadius:8,padding:'11px',fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>
                        {savingProfile?'Guardando...':'Guardar'}
                      </button>
                      <button onClick={()=>setEditProfile(false)}
                        style={{flex:1,background:'white',color:C.txt,border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'11px',fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ):(
                  <div>
                    {[{label:'Nombre completo',value:`${member?.nombre} ${member?.apellido}`},{label:'Email',value:member?.email},{label:'Teléfono',value:member?.telefono||'—'}].map(({label,value})=>(
                      <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:`0.5px solid ${C.crema}`}}>
                        <span style={{fontSize:13,fontWeight:400,color:C.muted}}>{label}</span>
                        <span style={{fontSize:14,fontWeight:600,color:C.txt}}>{value}</span>
                      </div>
                    ))}
                    <button onClick={()=>setEditProfile(true)}
                      style={{width:'100%',marginTop:14,background:'white',color:C.txt,border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'11px',fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>
                      ✏️ Editar información
                    </button>
                  </div>
                )}
                <p style={{fontSize:11,fontWeight:400,color:C.muted,textAlign:'center' as const,marginTop:14}}>Para cambiar email o instrumentos, contacta al administrador.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
