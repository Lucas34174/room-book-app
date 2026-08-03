import { prisma } from '../../lib/prisma'
import { NextResponse } from 'next/server'
import { getSession } from '../../lib/auth-helpers'

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { userId: session.userId },
            select: {
                userId: true,
                username: true,
                email: true,
                phone: true,
                firstname: true,
                lastname: true,
                role: {
                    select: {
                        name: true,
                        description: true,
                        maxActiveBookings: true
                    }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error('[GET /api/profile]', error)
        return NextResponse.json(
            { error: 'Erreur lors du chargement du profil.' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { firstname, lastname, username, email, phone } = body

        if (!firstname?.trim() || !lastname?.trim() || !username?.trim() || !email?.trim()) {
            return NextResponse.json(
                { error: 'Tous les champs obligatoires (*) doivent être renseignés.' },
                { status: 400 }
            )
        }

        // Vérification de l'unicité du pseudo si modifié
        if (username.trim() !== session.username) {
            const existingUsername = await prisma.user.findUnique({
                where: { username: username.trim() }
            })
            if (existingUsername) {
                return NextResponse.json(
                    { error: 'Ce pseudo est déjà utilisé.' },
                    { status: 400 }
                )
            }
        }

        // Vérification de l'unicité de l'email si modifié
        const currentUser = await prisma.user.findUnique({
            where: { userId: session.userId },
            select: { email: true }
        })
        if (currentUser && email.trim() !== currentUser.email) {
            const existingEmail = await prisma.user.findUnique({
                where: { email: email.trim() }
            })
            if (existingEmail) {
                return NextResponse.json(
                    { error: 'Cette adresse email est déjà utilisée.' },
                    { status: 400 }
                )
            }
        }

        const updated = await prisma.user.update({
            where: { userId: session.userId },
            data: {
                firstname: firstname.trim(),
                lastname: lastname.trim(),
                username: username.trim(),
                email: email.trim(),
                phone: phone ? phone.trim() : null
            },
            select: {
                userId: true,
                username: true,
                email: true,
                phone: true,
                firstname: true,
                lastname: true,
                role: {
                    select: {
                        name: true,
                        description: true,
                        maxActiveBookings: true
                    }
                }
            }
        })

        return NextResponse.json({ success: true, user: updated })
    } catch (error) {
        console.error('[PUT /api/profile]', error)
        return NextResponse.json(
            { error: 'Erreur lors de la mise à jour du profil.' },
            { status: 500 }
        )
    }
}
