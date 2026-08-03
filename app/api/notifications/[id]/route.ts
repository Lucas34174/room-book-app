import { prisma } from '../../../lib/prisma'
import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth-helpers'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    try {
        const { id } = await params
        const notificationId = parseInt(id)
        if (isNaN(notificationId)) {
            return NextResponse.json({ error: 'ID de notification invalide.' }, { status: 400 })
        }

        // Vérifier l'existence et la propriété de la notification
        const notification = await prisma.notification.findUnique({
            where: { notificationId },
            include: {
                booking: true
            }
        })

        if (!notification) {
            return NextResponse.json({ error: 'Notification introuvable.' }, { status: 404 })
        }

        // Autoriser si l'utilisateur est le propriétaire de la réservation ou un validateur/admin
        const isValidator = session.roleName === 'admin' || session.roleName === 'validator'
        const isOwner = notification.booking?.userId === session.userId

        if (!isOwner && !isValidator) {
            return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
        }

        // Passer le statut à SENT (ce qui signifie lue pour les notifications IN_APP)
        const updated = await prisma.notification.update({
            where: { notificationId },
            data: {
                status: 'SENT',
                sentAt: new Date()
            }
        })

        return NextResponse.json({ success: true, notification: updated })
    } catch (error) {
        console.error('[PATCH /api/notifications/[id]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la mise à jour.' },
            { status: 500 }
        )
    }
}
