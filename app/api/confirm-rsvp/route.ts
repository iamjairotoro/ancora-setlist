import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { token, respuesta, comentario } = await req.json()
  const status = respuesta === 'si' ? 'confirmado' : 'declinado'

  const { error } = await supabase
    .from('invitations')
    .update({ status, comentario: comentario || null })
    .eq('token', token)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
