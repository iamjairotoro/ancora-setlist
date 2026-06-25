import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  // Get invitation by token
  const { data: inv } = await supabase
    .from('invitations')
    .select('*, member:members(*), service:services(*)')
    .eq('token', token)
    .single()

  if (!inv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const memberId = inv.member_id

  // Get all upcoming services this member is assigned to
  const { data: allAssignments } = await supabase
    .from('banda_assignments')
    .select('posicion, service:services(*)')
    .eq('member_id', memberId)
    .order('service(fecha)', { ascending: true })

  // For each service, get full details
  const services = []
  const today = new Date().toISOString().split('T')[0]

  for (const a of (allAssignments || [])) {
    const svc = a.service as any
    if (!svc || svc.fecha < today) continue

    const [invData, setlistData, bandaData] = await Promise.all([
      supabase.from('invitations').select('status,comentario,token').eq('service_id', svc.id).eq('member_id', memberId).single(),
      supabase.from('setlist_items').select('orden,tono,link,song:songs(nombre,artista,link_spotify,link_letras),lead:members(nombre)').eq('service_id', svc.id).order('orden'),
      supabase.from('banda_assignments').select('posicion,member:members(nombre)').eq('service_id', svc.id),
    ])

    services.push({
      service: svc,
      posicion: a.posicion,
      invitation: invData.data,
      setlist: setlistData.data || [],
      banda: bandaData.data || [],
    })
  }

  return NextResponse.json({
    member: inv.member,
    currentInvitation: inv,
    services,
  })
}

export async function PATCH(req: NextRequest) {
  const { token, nombre, apellido, telefono } = await req.json()

  const { data: inv } = await supabase
    .from('invitations').select('member_id').eq('token', token).single()
  if (!inv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await supabase.from('members').update({ nombre, apellido, telefono })
    .eq('id', inv.member_id)

  return NextResponse.json({ ok: true })
}
