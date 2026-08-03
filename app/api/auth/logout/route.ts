import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('session_token')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/auth/logout]', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la déconnexion.' },
      { status: 500 }
    )
  }
}
