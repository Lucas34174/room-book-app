import { prisma } from '../../../lib/prisma'
import { sendPasswordResetEmail } from '../../../lib/mailer'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

const TOKEN_TTL_MINUTES = 30

// Fabrique une réponse générique fraîche à chaque appel
// (un objet NextResponse/Response ne peut être retourné qu'une seule fois)
function genericOk() {
    return NextResponse.json({
        message: "Si cet email est associé à un compte, un lien de réinitialisation vous a été envoyé."
    })
}

export async function POST(request: Request) {
    try {
        let body: { email?: string }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { email } = body

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email requis.' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        })

        // Email inconnu → même réponse générique, sans révéler l'existence du compte
        if (!user) {
            return genericOk()
        }

        // Invalider les anciens tokens non utilisés pour cet utilisateur
        await prisma.passwordResetToken.updateMany({
            where: { userId: user.userId, usedAt: null },
            data: { usedAt: new Date() },
        })

        // Créer un nouveau token sécurisé (32 octets = 64 hex chars)
        const rawToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)

        await prisma.passwordResetToken.create({
            data: {
                userId: user.userId,
                token: rawToken,
                expiresAt,
            },
        })

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
        const resetUrl = `${baseUrl}/reinitialisation?token=${rawToken}`

        try {
            await sendPasswordResetEmail(user.email, resetUrl)
        } catch (mailErr) {
            // Erreur d'envoi email : loguée côté serveur uniquement, pas révélée au client
            console.error('[forgot-password] Erreur envoi email:', mailErr)
        }

        return genericOk()
    } catch (error) {
        console.error('[POST /api/auth/forgot-password]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue. Veuillez réessayer plus tard.' },
            { status: 500 }
        )
    }
}
