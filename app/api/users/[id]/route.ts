import { prisma } from '../../../lib/prisma'
import { NextResponse } from 'next/server'
import { sendAccountActivationEmail } from '../../../lib/mailer'
import { requireAdmin, getSession } from '../../../lib/auth-helpers'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireAdmin()
    if (guard) return guard
    try {
        const { id } = await params
        const userId = parseInt(id)
        if (isNaN(userId)) {
            return NextResponse.json({ error: 'ID utilisateur invalide.' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { userId },
            select: {
                userId: true,
                username: true,
                email: true,
                phone: true,
                firstname: true,
                lastname: true,
                enabled: true,
                disableReason: true,
                role: {
                    select: {
                        roleId: true,
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

        const roles = await prisma.authRole.findMany({
            select: {
                roleId: true,
                name: true,
                description: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json({ user, roles })
    } catch (error) {
        console.error('[GET /api/users/[id]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération.' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireAdmin()
    if (guard) return guard
    try {
        const { id } = await params
        const userId = parseInt(id)
        if (isNaN(userId)) {
            return NextResponse.json({ error: 'ID utilisateur invalide.' }, { status: 400 })
        }

        let body: {
            roleId?: number
            enabled?: boolean
            disableReason?: string | null
            username?: string
            email?: string
            firstname?: string
            lastname?: string
            phone?: string | null
        }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { roleId, enabled, disableReason, username, email, firstname, lastname, phone } = body

        // Verify if user exists
        const user = await prisma.user.findUnique({ where: { userId } })
        if (!user) {
            return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
        }

        // Validation of basic fields if provided
        if (username !== undefined && !username.trim()) {
            return NextResponse.json({ error: 'Le pseudo ne peut pas être vide.' }, { status: 400 })
        }
        if (email !== undefined && !email.trim()) {
            return NextResponse.json({ error: 'L\'email ne peut pas être vide.' }, { status: 400 })
        }
        if (firstname !== undefined && !firstname.trim()) {
            return NextResponse.json({ error: 'Le prénom ne peut pas être vide.' }, { status: 400 })
        }
        if (lastname !== undefined && !lastname.trim()) {
            return NextResponse.json({ error: 'Le nom ne peut pas être vide.' }, { status: 400 })
        }

        // Validation for deactivation
        if (enabled === false && !disableReason?.trim()) {
            return NextResponse.json(
                { error: 'Un motif est obligatoire pour désactiver un compte.', field: 'disableReason' },
                { status: 400 }
            )
        }

        const dataToUpdate: any = {}
        if (roleId !== undefined) dataToUpdate.roleId = roleId
        if (enabled !== undefined) dataToUpdate.enabled = enabled
        if (enabled === true) {
            dataToUpdate.disableReason = null
        } else if (enabled === false && disableReason !== undefined && disableReason !== null && disableReason.trim() !== '') {
            dataToUpdate.disableReason = disableReason.trim()
        }
        if (username !== undefined) dataToUpdate.username = username.trim()
        if (email !== undefined) dataToUpdate.email = email.trim()
        if (firstname !== undefined) dataToUpdate.firstname = firstname.trim()
        if (lastname !== undefined) dataToUpdate.lastname = lastname.trim()
        if (phone !== undefined) dataToUpdate.phone = phone ? phone.trim() : null

        const session = await getSession()
        const sessionUserId = session ? session.userId : userId // Fallback

        const updatedUser = await prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: { userId },
                data: dataToUpdate,
                select: {
                    userId: true,
                    username: true,
                    email: true,
                    phone: true,
                    firstname: true,
                    lastname: true,
                    enabled: true,
                    disableReason: true,
                    role: {
                        select: {
                            roleId: true,
                            name: true,
                            description: true
                        }
                    }
                }
            })

            // 1. Log d'activation / désactivation
            if (user.enabled !== updated.enabled) {
                const actionName = updated.enabled ? 'COMPTE_ACTIVE' : 'COMPTE_DESACTIVE'
                const actionDesc = updated.enabled 
                    ? 'Activation d\'un compte utilisateur par un administrateur.' 
                    : 'Désactivation d\'un compte utilisateur par un administrateur.'

                const dbAction = await tx.action.upsert({
                    where: { name: actionName },
                    update: {},
                    create: { name: actionName, description: actionDesc }
                })

                await tx.log.create({
                    data: {
                        actionId: dbAction.actionId,
                        userId: sessionUserId,
                        details: updated.enabled
                            ? `Le compte de l'utilisateur ${updated.username} (ID: ${updated.userId}) a été activé.`
                            : `Le compte de l'utilisateur ${updated.username} (ID: ${updated.userId}) a été désactivé. Motif : ${updated.disableReason}`
                    }
                })
            }

            // 2. Log de changement de rôle
            if (roleId !== undefined && user.roleId !== updated.role.roleId) {
                const actionName = 'COMPTE_ROLE_MODIFIE'
                const actionDesc = 'Changement de rôle d\'un utilisateur par un administrateur.'

                const dbAction = await tx.action.upsert({
                    where: { name: actionName },
                    update: {},
                    create: { name: actionName, description: actionDesc }
                })

                await tx.log.create({
                    data: {
                        actionId: dbAction.actionId,
                        userId: sessionUserId,
                        details: `Le rôle de l'utilisateur ${updated.username} (ID: ${updated.userId}) a été changé vers ${updated.role.name}.`
                    }
                })
            }

            return updated
        })

        // Check if we need to send activation email (was false, now true)
        if (user.enabled === false && updatedUser.enabled === true) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
            const loginUrl = `${baseUrl}/login`
            try {
                await sendAccountActivationEmail(updatedUser.email, loginUrl)
            } catch (err) {
                console.error('[PUT /api/users] Failed to send activation email to:', updatedUser.email, err)
            }
        }


        return NextResponse.json({ success: true, user: updatedUser })
    } catch (error) {
        console.error('[PUT /api/users]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la mise à jour.' },
            { status: 500 }
        )
    }
}
