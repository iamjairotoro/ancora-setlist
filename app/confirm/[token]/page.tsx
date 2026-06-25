'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Invitation, Service, Member } from '@/lib/types'

export default function ConfirmPage() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const initial = searchParams.get('r') // 'si' o 'no'

  const [inv, setInv] = useState<Invitation | null>(null)
  const [service, setService] = useState<Service | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [status, setStatus] = useState<'confirmado'|'declinado'|null>(null)
  const [comentario, setComentario] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('invitations')
        .select('*, member:members(*), service:services(*)')
        .eq('token', token)
        .single()

      if (!data) { setNotFound(true); setLoading(false); return }
      setInv(data)
      setService(data.service as Service)
      setMember(data.member as Member)
      if (data.status !== 'pendiente') {
        setStatus(data.status)
        setComentario(data.comentario || '')
        setDone(true)
      } else if (initial === 'si') setStatus('confirmado')
      else if (initial === 'no') setStatus('declinado')
      setLoading(false)
    }
    load()
  }, [token, initial])

  async function submit() {
    if (!status || !inv) return
    setSaving(true)
    await supabase.from('invitations').update({
      status, comentario: comentario || null,
      responded_at: new Date().toISOString()
    }).eq('token', token)
    setDone(true)
    setSaving(false)
  }

  function fmt(fecha: string) {
    const d = new Date(fecha + 'T12:00:00')
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm">Cargando...</div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 text-center max-w-sm">
        <p className="text-4xl mb-3">🤔</p>
        <h2 className="font-semibold text-navy mb-2">Link no válido</h2>
        <p className="text-sm text-gray-500">Este link de invitación no existe o ya expiró.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="bg-navy rounded-t-xl p-5 text-center">
          <p className="text-gold font-bold text-lg">Ancora</p>
          <p className="text-white/60 text-xs mt-0.5">Confirmación de asistencia</p>
        </div>

        <div className="bg-white rounded-b-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Hola,</p>
          <p className="font-semibold text-navy text-lg mb-1">{member?.nombre} {member?.apellido}</p>
          {service && <p className="text-sm text-gray-500 mb-5">{fmt(service.fecha)}</p>}

          {done ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-3">{status === 'confirmado' ? '🎉' : '😔'}</p>
              <p className="font-semibold text-navy mb-1">
                {status === 'confirmado' ? '¡Confirmado!' : 'Entendido'}
              </p>
              <p className="text-sm text-gray-500">
                {status === 'confirmado'
                  ? 'Quedaste anotado para el servicio. ¡Nos vemos!'
                  : 'Gracias por avisar. Ya le notificamos al equipo.'}
              </p>
              {comentario && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3 text-left">
                  <p className="text-xs text-gray-400 mb-1">Tu comentario:</p>
                  <p className="text-sm text-gray-600">"{comentario}"</p>
                </div>
              )}
              <button onClick={() => setDone(false)}
                className="mt-4 text-xs text-gray-400 hover:text-navy underline">
                Cambiar respuesta
              </button>
            </div>
          ) : (
            <div>
              {/* Toggle yes/no */}
              <p className="text-sm text-gray-600 mb-3">¿Puedes asistir?</p>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setStatus('confirmado')}
                  className={`flex-1 py-3 rounded-lg font-medium text-sm border transition-all ${
                    status === 'confirmado'
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                  }`}>
                  ✓ Sí, confirmo
                </button>
                <button onClick={() => setStatus('declinado')}
                  className={`flex-1 py-3 rounded-lg font-medium text-sm border transition-all ${
                    status === 'declinado'
                      ? 'bg-red-50 text-red-600 border-red-300'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                  }`}>
                  ✗ No puedo
                </button>
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">Comentario (opcional)</label>
                <textarea className="input resize-none h-20 text-sm"
                  placeholder={status === 'declinado' ? 'ej: Tengo otro compromiso ese día' : 'ej: Llego 15 min tarde'}
                  value={comentario}
                  onChange={e => setComentario(e.target.value)} />
              </div>

              <button onClick={submit} disabled={!status || saving}
                className="btn-primary w-full">
                {saving ? 'Guardando...' : 'Enviar respuesta'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
