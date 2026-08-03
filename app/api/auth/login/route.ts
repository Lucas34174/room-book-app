import { prisma } from '../../../lib/prisma'
import { comparePassword, signJWT } from '../../../lib/auth'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        let body: { identifier?: string; password?: string }
        try {
            body = await request.json()
        } catch {
            // JSON malformé envoyé par le client
            return NextResponse.json(
                { error: 'Requête invalide.' },
                { status: 400 }
            )
        }

        const { identifier, password } = body

        if (!identifier || !password) {
            return NextResponse.json(
                { error: 'Identifiant et mot de passe requis.' },
                { status: 400 }
            )
        }

        // On cherche par email OU username
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { username: identifier }],
            },
            include: {
                role: true
            }
        })

        // Cas : utilisateur inexistant 
        if (!user) {
            return NextResponse.json(
                { error: 'Identifiant ou mot de passe incorrect.' },
                { status: 401 }
            )
        }

        // Cas : mot de passe incorrect 
        const passwordValid = await comparePassword(password, user.password)
        if (!passwordValid) {
            return NextResponse.json(
                { error: 'Identifiant ou mot de passe incorrect.' },
                { status: 401 }
            )
        }

        // Cas : compte bloqué
        if (!user.enabled) {
            return NextResponse.json(
                {
                    error:
                        user.disableReason ? "Votre compte a été désactivé pour motif: " + user.disableReason + "." :
                            "Compte en attente de validation par l'administration.",
                },
                { status: 403 }
            )
        }

        // Cas : succès → génération du JWT
        const token = await signJWT({
            userId: user.userId,
            roleId: user.roleId,
            roleName: user.role.name,
            username: user.username,
        })

        // Stockage dans un cookie HTTPOnly 
        const cookieStore = await cookies()
        cookieStore.set('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 jours
            path: '/',
        })

        return NextResponse.json({
            success: true,
            user: {
                userId: user.userId,
                username: user.username,
                roleId: user.roleId,
            },
        })
    } catch (error) {
        // Filet de sécurité : toute erreur inattendue 
        console.error('[POST /api/auth/login]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue. Veuillez réessayer plus tard.' },
            { status: 500 }
        )
    }
}