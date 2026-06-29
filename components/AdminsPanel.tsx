'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { crema:'#F5F0E6', cremaDark:'#E0D8C8', txt:'#1A1A1A', muted:'#999' }

interface AdminEmail { email: string; created_at: string }

export default function AdminsPanel() {
  const [admins, setAdmins] = useState<AdminEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    const { data } = await supabase.from('admin_emails').select('*').order('created_at')
    setAdmins(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addAdmin() {
    if (!newEmail.trim()) return
    setAdding(true); setErr(''); setMsg('')
    const { error } = await supabase.from('admin_emails').insert({ email: newEmail.trim().toLowerCase() })
    if (error) {
      setErr(error.code === '23505' ? 'Ese email ya es administrador.' : error.message)
    } else {
      setMsg(`✓ ${newEmail} agregado como administrador`)
      setNewEmail('')
      load()
    }
    setAdding(false)
  }

  async function removeAdmin(email: string) {
    if (admins.length <= 1) { setErr('Debe haber al menos un administrador.'); return }
    if (!confirm(`¿Quitar a ${email} como administrador?`)) return
    await supabase.from('admin_emails').delete().eq('email', email)
    setMsg(`${email} ya no es administrador`)
    load()
  }

  const input: React.CSSProperties = { border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',outline:'none',color:C.txt,background:'white',flex:1 }
  const btnDark: React.CSSProperties = { background:C.txt,color:C.crema,border:'none',borderRadius:8,padding:'9px 16px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }
  const btnRed: React.CSSProperties = { background:'#FEE2E2',color:'#B91C1C',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }

  return (
    <div style={{maxWidth:560,fontFamily:'"Helvetica Neue",Helvetica,Arial,sans-serif'}}>
      <div style={{background:'white',border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          <h2 style={{fontSize:13,fontWeight:700,color:C.txt,letterSpacing:0.5,textTransform:'uppercase',marginBottom:2}}>Administradores</h2>
          <p style={{fontSize:11,color:C.muted}}>Solo estos correos pueden acceder al panel de administración.</p>
        </div>

        {/* Lista de admins */}
        {loading ? (
          <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Cargando...</div>
        ) : (
          <div>
            {admins.map(a => (
              <div key={a.email} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:`0.5px solid ${C.crema}`}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:C.txt,color:C.crema,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>
                  {a.email[0].toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,color:C.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.email}</p>
                  <p style={{fontSize:10,color:C.muted,marginTop:1}}>
                    Desde {new Date(a.created_at).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}
                  </p>
                </div>
                <button onClick={() => removeAdmin(a.email)} style={btnRed}>
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Agregar admin */}
        <div style={{padding:'14px 16px',borderTop:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          {msg && <p style={{fontSize:12,color:'#1B4332',background:'#D8F3DC',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{msg}</p>}
          {err && <p style={{fontSize:12,color:'#B91C1C',background:'#FEE2E2',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{err}</p>}
          <p style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Agregar administrador</p>
          <div style={{display:'flex',gap:8}}>
            <input
              style={input}
              type="email"
              placeholder="correo@gmail.com"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setErr(''); setMsg('') }}
              onKeyDown={e => e.key === 'Enter' && addAdmin()}
            />
            <button onClick={addAdmin} disabled={adding || !newEmail.trim()} style={{...btnDark,opacity:adding||!newEmail.trim()?0.5:1}}>
              {adding ? '...' : '+ Agregar'}
            </button>
          </div>
          <p style={{fontSize:10,color:C.muted,marginTop:8}}>⚠️ El correo debe tener una cuenta Google para poder iniciar sesión.</p>
        </div>
      </div>
    </div>
  )
}
