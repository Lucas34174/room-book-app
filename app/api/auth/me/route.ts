import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth-helpers'

export async function GET() {
    const session = await getSession()
    console.log("session" + session);

    if (!session) {
        return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })
    }
    return NextResponse.json({
        userId: session.userId,
        username: session.username,
        roleName: session.roleName,
    })
}
