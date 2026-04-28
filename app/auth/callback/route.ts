import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function isEmailOtpType(type: string | null): type is EmailOtpType {
  return (
    type === 'signup' ||
    type === 'invite' ||
    type === 'magiclink' ||
    type === 'recovery' ||
    type === 'email_change' ||
    type === 'email'
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')
  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    return NextResponse.redirect(`${origin}/login?success=email-confirmed`)
  }

  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  if (errorCode || errorDescription) {
    const message = errorDescription ?? errorCode ?? 'auth-callback-failed'
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`
    )
  }

  // Hata durumu — login sayfasına yönlendir
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
