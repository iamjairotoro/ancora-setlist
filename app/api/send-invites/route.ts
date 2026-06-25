import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function sendEmail(to: string, subject: string, html: string) {
  const user = process.env.GMAIL_USER!
  const pass = process.env.GMAIL_APP_PASSWORD!

  // Use Gmail SMTP via fetch to smtp2go or direct nodemailer-style
  // We'll use the Gmail API via raw SMTP through a simple approach
  const { createTransport } = await import('nodemailer')
  const transporter = createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
  await transporter.sendMail({
    from: `Ancora Setlist <${user}>`,
    to,
    subject,
    html,
  })
}

export async function POST(req: NextRequest) {
  const { serviceId } = await req.json()

  const { data: service } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })

  const { data: assignments } = await supabase
    .from('banda_assignments')
    .select('*, member:members(*)')
    .eq('service_id', serviceId)

  if (!assignments?.length)
    return NextResponse.json({ error: 'No hay músicos asignados' }, { status: 400 })

  type MemberEntry = { member: { nombre: string; email: string; id: string }; posiciones: string[] }
  const uniqueMembers: Record<string, MemberEntry> = {}
  for (const a of assignments) {
    if (!a.member?.email) continue
    if (!uniqueMembers[a.member_id]) {
      uniqueMembers[a.member_id] = { member: a.member, posiciones: [] }
    }
    uniqueMembers[a.member_id].posiciones.push(a.posicion)
  }

  const { data: setlist } = await supabase
    .from('setlist_items')
    .select('orden, tono, song:songs(nombre, artista), lead:members(nombre)')
    .eq('service_id', serviceId)
    .order('orden')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  const d = new Date(service.fecha + 'T12:00:00')
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const fechaFmt = `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`

  let sent = 0
  const errors: string[] = []

  for (const [memberId, { member, posiciones }] of Object.entries(uniqueMembers)) {
    await supabase
      .from('invitations')
      .upsert({ service_id: serviceId, member_id: memberId, sent_at: new Date().toISOString() },
               { onConflict: 'service_id,member_id' })

    const { data: fullInv } = await supabase
      .from('invitations').select('token').eq('service_id', serviceId).eq('member_id', memberId).single()

    if (!fullInv?.token) continue

    const confirmUrl = `${appUrl}/confirm/${fullInv.token}?r=si`
    const declineUrl = `${appUrl}/confirm/${fullInv.token}?r=no`

    const setlistHtml = setlist?.length
      ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
          <tr style="background:#1F2A44;color:white">
            <th style="padding:8px;text-align:left">#</th>
            <th style="padding:8px;text-align:left">Canción</th>
            <th style="padding:8px;text-align:left">Tono</th>
            <th style="padding:8px;text-align:left">Lead</th>
          </tr>
          ${setlist.map((item: any) => `
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:8px;color:#888">${item.orden}</td>
              <td style="padding:8px;font-weight:500">${(item.song as any)?.nombre || '—'}</td>
              <td style="padding:8px;color:#888">${item.tono || '—'}</td>
              <td style="padding:8px">${(item.lead as any)?.nombre || '—'}</td>
            </tr>`).join('')}
        </table>`
      : '<p style="color:#888;font-size:13px">El setlist aún no está definido.</p>'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1F2A44;padding:24px 28px">
      <h1 style="color:#C9A14A;margin:0;font-size:20px">Ancora</h1>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Setlist semanal</p>
    </div>
    <div style="padding:28px">
      <h2 style="color:#1F2A44;margin:0 0 4px;font-size:18px">Hola, ${member.nombre} 👋</h2>
      <p style="color:#555;font-size:14px;margin:4px 0 0">Tienes una invitación para el servicio del:</p>
      <p style="color:#1F2A44;font-weight:600;font-size:16px;margin:8px 0">${fechaFmt}</p>
      <div style="background:#f8f8f8;border-radius:8px;padding:12px 16px;margin:16px 0">
        <p style="margin:0;font-size:13px;color:#555">Tu(s) rol(es) este domingo:</p>
        <p style="margin:4px 0 0;font-weight:600;color:#1F2A44;font-size:15px">${posiciones.join(' · ')}</p>
      </div>
      <p style="color:#555;font-size:14px;font-weight:500;margin:20px 0 8px">Setlist del servicio:</p>
      ${setlistHtml}
      <p style="color:#555;font-size:14px;margin:24px 0 12px">¿Puedes asistir?</p>
      <div style="display:flex;gap:12px;margin-bottom:28px">
        <a href="${confirmUrl}" style="flex:1;background:#1F2A44;color:white;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">✓ Sí, confirmo</a>
        <a href="${declineUrl}" style="flex:1;background:white;color:#666;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;border:1px solid #ddd">✗ No puedo ir</a>
      </div>
      <p style="color:#aaa;font-size:11px;text-align:center">Si haces clic en un botón podrás dejar un comentario.</p>
    </div>
  </div>
</body>
</html>`

    try {
      await sendEmail(member.email, `🎵 Setlist Ancora — ${fechaFmt}`, html)
      sent++
    } catch (e: any) {
      errors.push(`${member.nombre}: ${e.message}`)
    }
  }

  if (errors.length) {
    return NextResponse.json({ message: `${sent} enviado(s). Errores: ${errors.join(', ')}` })
  }
  return NextResponse.json({ message: `✓ ${sent} invitación(es) enviada(s)` })
}
