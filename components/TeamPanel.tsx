'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Member, Instrument } from '@/lib/types'
import AvatarUpload from './AvatarUpload'

const ALL_INSTRUMENTOS: Instrument[] = [
  'Guitarra Acustica','Guitarra Electrica','Piano',
  'MD (Direccion Musical en vivo)','Bajo','Bateria','Voz','Sonido','Montaje','Perc menores'
]
const SHORT: Record<string, string> = {
  'Guitarra Acustica': 'AG', 'Guitarra Electrica': 'EG',
  'MD (Direccion Musical en vivo)': 'MD', 'Perc menores': 'Perc',
  'Piano': 'Piano', 'Bajo': 'Bass',
  'Bateria': 'Drums', 'Voz': 'Voz', 'Sonido': 'Sonido', 'Montaje': 'Montaje',
}

interface Props { members: Member[]; onRefresh: () => void }

const newEmpty = () => ({ nombre:'', apellido:'', email:'', telefono:'', instrumentos:[] as Instrument[] })

export default function TeamPanel({ members, onRefresh }: Props) {
  const [editing, setEditing] = useState<Partial<Member> | null>(null)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  function toggleInstr(instr: Instrument) {
    if (!editing) return
    const cur = editing.instrumentos || []
    setEditing({ ...editing, instrumentos: cur.includes(instr) ? cur.filter(i => i !== instr) : [...cur, instr] })
  }

  async function save() {
    if (!editing) return
    if (!editing.nombre || !editing.email) { setErr('Nombre y email son obligatorios'); return }
    setSaving(true); setErr('')
    const payload = {
      nombre: editing.nombre,
      apellido: editing.apellido || '',
      email: editing.email,
      telefono: editing.telefono || '',
      instrumentos: editing.instrumentos || [],
      fecha_nacimiento: editing.fecha_nacimiento || null,
    }
    if (editing.id) {
      await supabase.from('members').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('members').insert(payload)
    }
    setSaving(false)
    setEditing(null)
    onRefresh()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este integrante?')) return
    await supabase.from('members').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{members.length} integrante{members.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setEditing(newEmpty())} className="btn-primary text-sm">+ Agregar</button>
      </div>

      {/* Edit / Add form */}
      {editing && (
        <div className="card p-4 border-navy border">
          <h3 className="font-semibold text-navy mb-4">{editing.id ? 'Editar' : 'Nuevo'} integrante</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Nombre *</label>
              <input className="input" value={editing.nombre || ''}
                onChange={e => setEditing({...editing, nombre: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Apellido</label>
              <input className="input" value={editing.apellido || ''}
                onChange={e => setEditing({...editing, apellido: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Email *</label>
              <input className="input" type="email" value={editing.email || ''}
                onChange={e => setEditing({...editing, email: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Teléfono</label>
              <input className="input" value={editing.telefono || ''}
                onChange={e => setEditing({...editing, telefono: e.target.value})} />
              <label className="text-sm text-gray-500 mb-1 block mt-2">Fecha de nacimiento</label>
              <input type="date" className="input" value={editing.fecha_nacimiento || ''}
                onChange={e => setEditing({...editing, fecha_nacimiento: e.target.value})} />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm text-gray-500 mb-2 block">Instrumentos</label>
            <div className="flex flex-wrap gap-2">
              {ALL_INSTRUMENTOS.map(instr => {
                const active = (editing.instrumentos || []).includes(instr)
                return (
                  <button key={instr} type="button" onClick={() => toggleInstr(instr)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      active ? 'bg-[#1A1A1A] text-[#F5F0E6] border-[#1A1A1A]' : 'bg-white text-[#1A1A1A] border-[#C8C0B4] hover:border-[#1A1A1A]'
                    }`}>
                    {SHORT[instr] || instr}
                  </button>
                )
              })}
            </div>
          </div>
          {err && <p className="text-red-500 text-sm mb-2">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => { setEditing(null); setErr('') }} className="btn-secondary text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="card divide-y divide-gray-50">
        {members.length === 0 && (
          <p className="p-4 text-sm text-gray-400">Sin integrantes. Agrega el primero.</p>
        )}
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3">
            {/* Avatar solo lectura — editable desde el portal del músico */}
            <div style={{width:36,height:36,borderRadius:'50%',background:'#1A1A1A',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {m.avatar_url
                ? <img src={m.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={m.nombre}/>
                : <span style={{fontFamily:'inherit',fontWeight:700,fontSize:13,color:'#F5F0E6'}}>{m.nombre?.[0]}{m.apellido?.[0]||''}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{m.nombre} {m.apellido}</p>
                {(m.instrumentos || []).map(i => (
                  <span key={i} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">
                    {SHORT[i] || i}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-500 truncate">{m.email}</p>
              {m.fecha_nacimiento && (
                <p className="text-xs text-gray-400 mt-0.5">
                  🎂 {new Date(m.fecha_nacimiento+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long'})}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => { setErr(''); setEditing({...m}) }}
                className="text-sm text-gray-400 hover:text-navy px-2 py-1">Editar</button>
              <button type="button" onClick={() => del(m.id)}
                className="text-sm text-gray-400 hover:text-red-500 px-2 py-1">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
