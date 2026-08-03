import { prisma } from '../../../lib/prisma'
import { hashPassword } from '../../../lib/auth'
import { NextResponse } from 'next/server'
import { Prisma } from '../../../generated/prisma/client'
import { sendNewUserNotificationToAdmins } from '../../../lib/mailer'

export async function POST(request: Request) {
    try {
        let body: {
            firstname?: string
            lastname?: string
            email?: string
            username?: string
            password?: string
            roleId?: string | number
            phone?: string
        }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { firstname, lastname, email, username, password, roleId, phone } = body

        // Validation basique
        if (!firstname || !lastname || !email || !username || !password || !roleId) {
            return NextResponse.json({ error: 'Tous les champs sont obligatoires.' }, { status: 400 })
        }

        // On résout le rôle par nom (le client envoie "teacher" ou "student")
        const role = await prisma.authRole.findUnique({
            where: { name: String(roleId) },
        })

        if (!role) {
            return NextResponse.json({ error: 'Rôle invalide.', field: 'roleId' }, { status: 400 })
        }

        // Hash du mot de passe avant stockage
        const hashedPassword = await hashPassword(String(password))

        // Création du compte avec enabled = false par défaut
        const user = await prisma.user.create({
            data: {
                firstname: String(firstname).trim(),
                lastname: String(lastname).trim(),
                email: String(email).trim().toLowerCase(),
                username: String(username).trim(),
                password: hashedPassword,
                roleId: role.roleId,
                enabled: false,
                phone: phone?.trim() || null
            },
            select: {
                userId: true,
                username: true,
                email: true,
                firstname: true,
                lastname: true,
            },
        })

        // -----------------------------------------------------------
        // Notifications aux admins (IN_APP + EMAIL) — fire and forget
        // -----------------------------------------------------------
        ;(async () => {
            try {
                // Récupérer ou créer l'action INSCRIPTION_COMPTE
                const action = await prisma.action.upsert({
                    where: { name: 'INSCRIPTION_COMPTE' },
                    update: {},
                    create: {
                        name: 'INSCRIPTION_COMPTE',
                        description: "Nouveau compte utilisateur inscrit, en attente de validation par l'administrateur.",
                    },
                })

                // Récupérer tous les comptes admin actifs
                const admins = await prisma.user.findMany({
                    where: {
                        enabled: true,
                        role: { name: 'admin' },
                    },
                    select: { userId: true, email: true },
                })

                if (admins.length === 0) return

                const details = `Nouvelle inscription : ${String(firstname).trim()} ${String(lastname).trim()} (${String(username).trim()}) — Rôle : ${role.name}`

                // Créer un Log par admin
                for (const admin of admins) {
                    const log = await prisma.log.create({
                        data: {
                            actionId: action.actionId,
                            userId: admin.userId,
                            details,
                        },
                    })

                    // Notification IN_APP
                    await prisma.notification.create({
                        data: {
                            logId: log.logId,
                            type: 'IN_APP',
                            status: 'PENDING',
                        },
                    })
                }

                // Email groupé à tous les admins
                const adminEmails = admins.map((a) => a.email)
                await sendNewUserNotificationToAdmins(adminEmails, {
                    firstname: String(firstname).trim(),
                    lastname: String(lastname).trim(),
                    email: String(email).trim().toLowerCase(),
                    username: String(username).trim(),
                    role: role.name,
                })
            } catch (notifErr) {
                console.error('[POST /api/auth/register] Erreur notification admins:', notifErr)
            }
        })()

        return NextResponse.json({ success: true, user }, { status: 201 })
    } catch (error) {
        // Violation de contrainte unique (email ou username déjà existant)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const target = (error.meta?.target as string[]) ?? []
            if (target.includes('email')) {
                return NextResponse.json(
                    { error: 'Cette adresse email est déjà associée à un compte.', field: 'email' },
                    { status: 409 }
                )
            }
            if (target.includes('username')) {
                return NextResponse.json(
                    { error: "Ce nom d'utilisateur est déjà pris.", field: 'username' },
                    { status: 409 }
                )
            }
            // Autre contrainte unique non prévue : message générique
            return NextResponse.json(
                { error: 'Ces informations sont déjà utilisées par un autre compte.' },
                { status: 409 }
            )
        }

        console.error('[POST /api/auth/register]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue. Veuillez réessayer plus tard.' },
            { status: 500 }
        )
    }
}
