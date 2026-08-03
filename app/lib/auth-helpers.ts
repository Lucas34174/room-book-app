import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from './auth'

export async function getSession() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('session_token')?.value
        if (!token) return null
        return await verifyJWT(token)
    } catch {
        return null
    }
}

/** Exige un admin. Retourne une 401/403 Response en cas d'échec, null si OK. */
export async function requireAdmin(): Promise<Response | null> {
    const session = await getSession()
    if (!session) {
        return NextResponse.json(
            { error: 'Vous devez être connecté pour effectuer cette action.' },
            { status: 401 }
        )
    }
    if (session.roleName !== 'admin') {
        return NextResponse.json(
            { error: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.' },
            { status: 403 }
        )
    }
    return null
}

/** Exige admin OU validator (Service Validateur). Retourne une 401/403 Response en cas d'échec, null si OK. */
export async function requireValidator(): Promise<Response | null> {
    const session = await getSession()
    if (!session) {
        return NextResponse.json(
            { error: 'Vous devez être connecté pour effectuer cette action.' },
            { status: 401 }
        )
    }
    if (session.roleName !== 'admin' && session.roleName !== 'validator') {
        return NextResponse.json(
            { error: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.' },
            { status: 403 }
        )
    }
    return null
}

/** Exige toute session valide. Retourne une 401 Response en cas d'échec, null si OK. */
export async function requireAuth(): Promise<Response | null> {
    const session = await getSession()
    if (!session) {
        return NextResponse.json(
            { error: 'Vous devez être connecté pour effectuer cette action.' },
            { status: 401 }
        )
    }
    return null
}