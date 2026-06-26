import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const { data: inv } = await supabase
    .from('invitations')
    .select('*, member:members(*), service:services(*)')
    .eq('token', token)
    .single()

  if (!inv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const memberId = inv.member_id
  const today = new Date().toISOString().split('T')[0]

  // Get ALL assignments for this member — multiple posiciones per service
  const { data: allAssignments } = await supabase
    .from('banda_assignments')
    .select('posicion, service:services(*)')
    .eq('member_id', memberId)

  // Group by service_id — collect all posiciones per service
  const serviceMap: Record<string, { svc: any; posiciones: string[] }> = {}
  for (const a of (allAssignments || [])) {
    const svc = a.service as any
    if (!svc || svc.fecha < today) continue
    if (!serviceMap[svc.id]) {
      serviceMap[svc.id] = { svc, posiciones: [] }
    }
    serviceMap[svc.id].posiciones.push(a.posicion)
  }

  // Sort services by fecha ascending
  const sortedServices = Object.values(serviceMap).sort((a, b) =>
    a.svc.fecha.localeCompare(b.svc.fecha)
  )

  // Fetch full details once per service (not once per assignment)
  const services = []
  for (const { svc, posiciones } of sortedServices) {
    const [invData, setlistData, bandaData] = await Promise.all([
      supabase.from('invitations').select('status,comentario,token')
        .eq('service_id', svc.id).eq('member_id', memberId).single(),
      supabase.from('service_blocks')
        .select('orden,tono,titulo,tipo,duracion_min,song:songs(nombre,artista,bpm,link_spotify,link_letras,link_recursos,duracion_min),lead:members(nombre)')
        .eq('service_id', svc.id).order('orden'),
      supabase.from('banda_assignments')
        .select('posicion,member:members(nombre)').eq('service_id', svc.id),
    ])

    services.push({
      service: svc,
      posiciones,          // array of ALL roles for this person
      invitation: invData.data,
      setlist: setlistData.data || [],
      banda: bandaData.data || [],
    })
  }

  return NextResponse.json({ member: inv.member, currentInvitation: inv, services })
}

export async function PATCH(req: NextRequest) {
  const { token, nombre, apellido, telefono } = await req.json()
  const { data: inv } = await supabase
    .from('invitations').select('member_id').eq('token', token).single()
  if (!inv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  await supabase.from('members').update({ nombre, apellido, telefono }).eq('id', inv.member_id)
  return NextResponse.json({ ok: true })
}
