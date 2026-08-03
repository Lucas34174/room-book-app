import { prisma } from '../../../../lib/prisma'
import { NextResponse } from 'next/server'
import { getSession, requireValidator } from '../../../../lib/auth-helpers'
import { processEmailNotification } from '../../../../lib/notifications'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Admin et validator (Service Validateur) peuvent traiter les demandes
    const validatorCheck = await requireValidator()
    if (validatorCheck) return validatorCheck

    const session = await getSession()

    try {
        const { id } = await params
        const bookingId = parseInt(id)
        if (isNaN(bookingId)) {
            return NextResponse.json({ error: 'ID de réservation invalide.' }, { status: 400 })
        }

        let body: { action?: 'confirm' | 'refuse'; refusalReason?: string }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { action, refusalReason } = body

        if (!action || !['confirm', 'refuse'].includes(action)) {
            return NextResponse.json({ error: 'Action invalide. Valeurs attendues : confirm, refuse.' }, { status: 400 })
        }

        if (action === 'refuse' && !refusalReason?.trim()) {
            return NextResponse.json(
                { error: 'Le motif de refus est obligatoire lors d\'un refus.' },
                { status: 400 }
            )
        }

        // Charger la réservation avec les détails de l'utilisateur et du créneau
        const booking = await prisma.booking.findUnique({
            where: { bookingId }
        })

        if (!booking) {
            return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
        }

        if (booking.status !== 'en_attente') {
            return NextResponse.json(
                { error: `Cette réservation ne peut plus être traitée (statut actuel : ${booking.status}).` },
                { status: 409 }
            )
        }

        const newStatus = action === 'confirm' ? 'confirmee' : 'refusee'

        // Mettre à jour le statut et créer log + notifications
        const emailNotificationId = await prisma.$transaction(async (tx) => {
            await tx.booking.update({
                where: { bookingId },
                data: {
                    status: newStatus as any,
                    updatedAt: new Date(),
                    ...(action === 'refuse' && { refusalReason: refusalReason!.trim() })
                }
            })

            const actionName = action === 'confirm' ? 'RESERVATION_VALIDEE' : 'RESERVATION_REFUSEE'
            const actionDescription = action === 'confirm'
                ? 'Validation d\'une demande de réservation par un administrateur.'
                : 'Refus d\'une demande de réservation par un administrateur.'

            const dbAction = await tx.action.upsert({
                where: { name: actionName },
                update: {},
                create: { name: actionName, description: actionDescription }
            })

            const log = await tx.log.create({
                data: {
                    actionId: dbAction.actionId,
                    userId: session!.userId,
                    details: action === 'confirm'
                        ? `Réservation #${bookingId} validée par ${session!.username}.`
                        : `Réservation #${bookingId} refusée par ${session!.username}. Motif: ${refusalReason}`
                }
            })

            // Notification In-App
            await tx.notification.create({
                data: {
                    logId: log.logId,
                    bookingId,
                    type: 'IN_APP', status: 'PENDING'
                }
            })

            // Notification Email
            const emailNotif = await tx.notification.create({
                data: {
                    logId: log.logId,
                    bookingId,
                    type: 'EMAIL',
                    status: 'PENDING'
                }
            })

            return emailNotif.notificationId
        })

        // Envoi d'email de notification asynchrone (non bloquant)
        processEmailNotification(emailNotificationId).catch(err => {
            console.error(`[PATCH /api/bookings/[id]/validate] Failed to process email notification #${emailNotificationId}:`, err)
        })

        return NextResponse.json({
            success: true,
            message: action === 'confirm'
                ? 'Réservation confirmée et demandeur notifié.'
                : 'Réservation refusée et demandeur notifié.'
        })

    } catch (error) {
        console.error('[PATCH /api/bookings/[id]/validate]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors du traitement de la demande.' },
            { status: 500 }
        )
    }
}
