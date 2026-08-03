import { prisma } from '../../../lib/prisma'
import { hashPassword } from '../../../lib/auth'
import { NextResponse } from 'next/server'

// GET /api/auth/reset-password?token=xxx  → valide le token avant d'afficher le formulaire
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Token manquant.' }, { status: 400 })
        }

        const record = await prisma.passwordResetToken.findUnique({ where: { token } })

        if (!record) {
            return NextResponse.json({ valid: false, error: 'Lien invalide ou déjà utilisé.' }, { status: 404 })
        }
        if (record.usedAt) {
            return NextResponse.json({ valid: false, error: 'Ce lien a déjà été utilisé.' }, { status: 410 })
        }
        if (record.expiresAt < new Date()) {
            return NextResponse.json({ valid: false, error: 'Ce lien a expiré. Veuillez faire une nouvelle demande.' }, { status: 410 })
        }

        return NextResponse.json({ valid: true })
    } catch (error) {
        console.error('[GET /api/auth/reset-password]', error)
        return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 })
    }
}

// POST /api/auth/reset-password  → applique le nouveau mot de passe
export async function POST(request: Request) {
    try {
        let body: { token?: string; password?: string }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { token, password } = body

        if (!token || !password) {
            return NextResponse.json({ error: 'Token et mot de passe requis.' }, { status: 400 })
        }
        if (typeof password !== 'string' || password.length < 6) {
            return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, { status: 400 })
        }

        const record = await prisma.passwordResetToken.findUnique({ where: { token } })

        if (!record || record.usedAt || record.expiresAt < new Date()) {
            return NextResponse.json(
                { error: 'Ce lien est invalide, expiré ou déjà utilisé. Veuillez faire une nouvelle demande.' },
                { status: 410 }
            )
        }

        const hashedPassword = await hashPassword(password)

        // Transaction atomique : invalider le token ET mettre à jour le mot de passe
        await prisma.$transaction([
            prisma.passwordResetToken.update({
                where: { tokenId: record.tokenId },
                data: { usedAt: new Date() },
            }),
            prisma.user.update({
                where: { userId: record.userId },
                data: { password: hashedPassword },
            }),
        ])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[POST /api/auth/reset-password]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue. Veuillez réessayer plus tard.' },
            { status: 500 }
        )
    }
}
