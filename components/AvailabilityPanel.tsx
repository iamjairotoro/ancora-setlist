'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Service, Member } from '@/lib/types'

const C = { crema:'#F5F0E6', cremaDark:'#E0D8C8', txt:'#1A1A1A', muted:'#999', bg:'#FDFCF9' }

interface AvailabilityRecord { id:string; member_id:string; service_id:string; status:'disponible'|'no_disponible' }

function fmtShort(fecha: string) {
  const d = new Date(fecha + 'T12:00:00')
  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return { top: `${dias[d.getDay()]} ${d.getDate()}`, bot: meses[d.getMonth()] }
}

function getInstrumentosLabel(instrumentos: string[]): string {
  const map: Record<string,string> = {
    'Guitarra Acustica':'AG','Guitarra Electrica':'EG','Keys':'KEYS','Piano':'KEYS',
    'Bajo':'BASS','Bateria':'DRUMS','MD (Direccion Musical en vivo)':'MD',
    'Sonido':'SONIDO','Voz':'VX',
  }
  const mapped = instrumentos.map(i => map[i]||i)
  return mapped.filter((v,i,a) => a.indexOf(v)===i).join(' · ')
}

interface Props {
  services: Service[]
}

export default function AvailabilityPanel({ services }: Props) {
  const [members, setMembers]       = useState<Member[]>([])
  const [avail, setAvail]           = useState<AvailabilityRecord[]>([])
  const [loading, setLoading]       = useState(true)
  const [toggling, setToggling]     = useState<string|null>(null)
  const [sending, setSending]       = useState(false)
  const [msg, setMsg]               = useState('')

  // Solo mostrar servicios futuros o del mes actual
  const now = new Date()
  const futureServices = services
    .filter(s => new Date(s.fecha + 'T23:59:00') >= now)
    .sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 6) // máximo 6 domingos

  const serviceIds = futureServices.map(s => s.id)

  const load = useCallback(async () => {
    if (!serviceIds.length) { setLoading(false); return }
    setLoading(true)
    const res = await fetch(`/api/availability?serviceIds=${serviceIds.join(',')}`)
    const data = await res.json()
    setMembers(data.members || [])
    setAvail(data.availability || [])
    setLoading(false)
  }, [services])

  useEffect(() => { load() }, [load])

  function getStatus(memberId: string, serviceId: string): 'disponible'|'no_disponible'|null {
    return avail.find(a => a.member_id === memberId && a.service_id === serviceId)?.status || null
  }

  async function toggle(memberId: string, serviceId: string) {
    const key = `${memberId}-${serviceId}`
    setToggling(key)
    const current = getStatus(memberId, serviceId)
    const next = current === 'disponible' ? 'no_disponible' : 'disponible'

    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', member_id: memberId, service_id: serviceId, status: next }),
    })
    const data = await res.json()
    if (data.availability) {
      setAvail(prev => {
        const filtered = prev.filter(a => !(a.member_id === memberId && a.service_id === serviceId))
        return [...filtered, data.availability]
      })
    }
    setToggling(null)
  }

  async function sendEmails() {
    setSending(true); setMsg('')
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send-availability-email', serviceIds }),
    })
    const data = await res.json()
    setMsg(data.message || 'Enviado ✓')
    setSending(false)
  }

  function countAvailable(serviceId: string) {
    return avail.filter(a => a.service_id === serviceId && a.status === 'disponible').length
  }

  const input: React.CSSProperties = { border:`1px solid ${C.cremaDark}`,borderRadius:8,padding:'7px 11px',fontSize:13,fontFamily:'inherit',outline:'none',background:'white',color:C.txt }
  const btnDark: React.CSSProperties = { background:C.txt,color:C.crema,border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:500,fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',gap:6 }

  if (loading) return (
    <div style={{padding:48,textAlign:'center',color:C.muted,fontSize:13}}>Cargando disponibilidad...</div>
  )

  if (!futureServices.length) return (
    <div style={{background:'white',border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:48,textAlign:'center'}}>
      <p style={{fontSize:32,marginBottom:8}}>📅</p>
      <p style={{fontSize:14,color:C.muted}}>No hay servicios próximos. Crea servicios en la pestaña Setlist.</p>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{background:'white',border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:'12px 16px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt,letterSpacing:0.5,textTransform:'uppercase',marginBottom:2}}>
            Disponibilidad del mes
          </h2>
          <p style={{fontSize:12,color:C.muted,fontWeight:300}}>
            Haz clic en una celda para alternar · <span style={{color:'#1B4332',fontWeight:500}}>verde = disponible</span> · <span style={{color:'#991B1B',fontWeight:500}}>rojo = no puede</span> · gris = sin respuesta
          </p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {msg && <span style={{fontSize:12,color:'#2D6A4F',fontWeight:500}}>{msg}</span>}
          <button onClick={sendEmails} disabled={sending} style={btnDark}>
            <span>✉</span>
            {sending ? 'Enviando...' : 'Consultar disponibilidad'}
          </button>
        </div>
      </div>

      {/* Matriz */}
      <div style={{background:'white',border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:500}}>
            <thead>
              <tr style={{background:C.crema}}>
                <th style={{padding:'10px 16px',textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.muted,width:160}}>
                  Músico
                </th>
                {futureServices.map(s => {
                  const { top, bot } = fmtShort(s.fecha)
                  const count = countAvailable(s.id)
                  return (
                    <th key={s.id} style={{padding:'8px 10px',textAlign:'center',fontSize:11,color:C.txt,borderLeft:`0.5px solid ${C.cremaDark}`,minWidth:80}}>
                      <div style={{fontWeight:700,fontSize:12}}>{top}</div>
                      <div style={{fontWeight:400,fontSize:10,color:C.muted}}>{bot}</div>
                      <div style={{marginTop:4,display:'inline-flex',alignItems:'center',justifyContent:'center',width:22,height:22,borderRadius:6,background:count>=5?'#D8F3DC':count>=3?'#FFF3CD':'#FEE2E2',fontSize:11,fontWeight:700,color:count>=5?'#1B4332':count>=3?'#664D03':'#991B1B'}}>
                        {count}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {members.map((member, idx) => (
                <tr key={member.id} style={{background:idx%2===0?'white':C.bg}}>
                  <td style={{padding:'10px 16px',borderBottom:`0.5px solid ${C.cremaDark}`}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.txt}}>{member.nombre} {member.apellido}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:1}}>{getInstrumentosLabel(member.instrumentos)}</div>
                  </td>
                  {futureServices.map(s => {
                    const status = getStatus(member.id, s.id)
                    const key = `${member.id}-${s.id}`
                    const isToggling = toggling === key
                    return (
                      <td key={s.id} style={{textAlign:'center',borderBottom:`0.5px solid ${C.cremaDark}`,borderLeft:`0.5px solid ${C.cremaDark}`,padding:'8px'}}>
                        <button
                          onClick={() => toggle(member.id, s.id)}
                          disabled={isToggling}
                          style={{
                            width:36,height:32,borderRadius:7,border:'none',cursor:'pointer',
                            fontWeight:700,fontSize:14,
                            background: isToggling ? '#EEE'
                              : status === 'disponible' ? '#D8F3DC'
                              : status === 'no_disponible' ? '#FEE2E2'
                              : 'rgba(0,0,0,0.06)',
                            color: status === 'disponible' ? '#1B4332'
                              : status === 'no_disponible' ? '#991B1B'
                              : '#CCC',
                            transition:'all 0.1s',
                          }}
                          title={status === 'disponible' ? 'Disponible — clic para cambiar' : status === 'no_disponible' ? 'No disponible — clic para cambiar' : 'Sin respuesta — clic para marcar disponible'}
                        >
                          {isToggling ? '·' : status === 'disponible' ? '✓' : status === 'no_disponible' ? '✗' : '—'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda */}
        <div style={{padding:'10px 16px',background:C.crema,borderTop:`0.5px solid ${C.cremaDark}`,display:'flex',gap:16,flexWrap:'wrap'}}>
          {[
            {bg:'#D8F3DC',color:'#1B4332',txt:'Disponible'},
            {bg:'#FEE2E2',color:'#991B1B',txt:'No disponible'},
            {bg:'rgba(0,0,0,0.06)',color:'#CCC',txt:'Sin respuesta'},
          ].map(({bg,color,txt})=>(
            <div key={txt} style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:18,height:16,borderRadius:4,background:bg,border:'none'}}/>
              <span style={{fontSize:11,color:C.muted}}>{txt}</span>
            </div>
          ))}
          <span style={{fontSize:11,color:C.muted,marginLeft:'auto'}}>El número en el header = disponibles por domingo</span>
        </div>
      </div>

      {/* Portal móvil hint */}
      <div style={{background:'white',border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:'12px 16px',marginTop:12,display:'flex',gap:12,alignItems:'center'}}>
        <span style={{fontSize:24}}>📱</span>
        <div>
          <p style={{fontSize:13,fontWeight:600,color:C.txt,marginBottom:2}}>Los músicos también pueden marcar desde su portal</p>
          <p style={{fontSize:12,color:C.muted,fontWeight:300}}>En la pestaña "Mis domingos" del portal pueden indicar disponibilidad para cada servicio directamente desde el celular.</p>
        </div>
      </div>
    </div>
  )
}
