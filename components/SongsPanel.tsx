'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Song } from '@/lib/types'

const NOTAS = ['A','A#','Bb','B','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab']

interface Props { songs: Song[]; onRefresh: () => void }

const EMPTY = { nombre:'', artista:'', tono_original:'', link_spotify:'', link_letras:'', notas:'' }

export default function SongsPanel({ songs, onRefresh }: Props) {
  const [editing, setEditing] = useState<Partial<Song> | null>(null)
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')

  async function save() {
    if (!editing?.nombre) return
    setSaving(true)
    const payload = { nombre: editing.nombre, artista: editing.artista || '',
      tono_original: editing.tono_original || null, link_spotify: editing.link_spotify || null,
      link_letras: editing.link_letras || null, notas: editing.notas || null }
    if (editing.id) {
      await supabase.from('songs').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('songs').insert(payload)
    }
    setSaving(false); setEditing(null); onRefresh()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar esta canción?')) return
    await supabase.from('songs').delete().eq('id', id)
    onRefresh()
  }

  const filtered = songs.filter(s =>
    s.nombre.toLowerCase().includes(search.toLowerCase()) ||
    s.artista.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <input className="input flex-1" placeholder="Buscar canción..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setEditing(EMPTY)} className="btn-primary text-sm">+ Agregar</button>
      </div>

      {editing && (
        <div className="card p-4 border-navy border">
          <h3 className="font-semibold text-navy mb-4">{editing.id ? 'Editar' : 'Nueva'} canción</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
              <input className="input" value={editing.nombre || ''} onChange={e => setEditing({...editing, nombre: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Artista / Autor</label>
              <input className="input" value={editing.artista || ''} onChange={e => setEditing({...editing, artista: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tono original</label>
              <select className="input" value={editing.tono_original || ''} onChange={e => setEditing({...editing, tono_original: e.target.value})}>
                <option value="">—</option>
                {NOTAS.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Link Spotify</label>
              <input className="input" placeholder="https://open.spotify.com/..." value={editing.link_spotify || ''} onChange={e => setEditing({...editing, link_spotify: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Letras / Acordes (Drive)</label>
              <input className="input" placeholder="https://drive.google.com/..." value={editing.link_letras || ''} onChange={e => setEditing({...editing, link_letras: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <input className="input" value={editing.notas || ''} onChange={e => setEditing({...editing, notas: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-gray-50">
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-gray-400">{search ? 'Sin resultados.' : 'Sin canciones. Agrega la primera.'}</p>
        )}
        {filtered.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{s.nombre}</p>
              <p className="text-xs text-gray-500">{s.artista}{s.tono_original ? ` · ${s.tono_original}` : ''}</p>
              <div className="flex gap-2 mt-1">
                {s.link_spotify && <a href={s.link_spotify} target="_blank" className="text-xs text-green-600 hover:underline">Spotify</a>}
                {s.link_letras  && <a href={s.link_letras}  target="_blank" className="text-xs text-blue-600 hover:underline">Letras</a>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(s)} className="text-xs text-gray-400 hover:text-navy px-2 py-1">Editar</button>
              <button onClick={() => del(s.id)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
