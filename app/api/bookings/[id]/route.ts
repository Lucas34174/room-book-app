import { prisma } from '../../../lib/prisma'
import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth-helpers'
import { processEmailNotification } from '../../../lib/notifications'

// Helper to format Date objects returned by Prisma for @db.Time() into "HH:MM"
function formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    try {
        const { id } = await params
        const bookingId = parseInt(id)
        if (isNaN(bookingId)) {
            return NextResponse.json({ error: 'ID de réservation invalide.' }, { status: 400 })
        }

        const booking = await prisma.booking.findUnique({
            where: { bookingId },
            include: {
                period: {
                    include: { room: true }
                },
                user: {
                    select: {
                        userId: true,
                        username: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        })

        if (!booking) {
            return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
        }

        // Seul l'auteur de la réservation ou un admin peut voir ces détails
        if (booking.userId !== session.userId && session.roleName !== 'admin') {
            return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
        }

        return NextResponse.json({
            booking: {
                bookingId: booking.bookingId,
                bookingDate: booking.bookingDate.toISOString().split('T')[0],
                status: booking.status,
                bookingReason: booking.bookingReason,
                roomName: booking.period.room.name,
                location: booking.period.room.location,
                timeStart: formatTime(booking.period.timeStart),
                timeEnd: formatTime(booking.period.timeEnd),
                user: `${booking.user.firstname} ${booking.user.lastname}`
            }
        })
    } catch (error) {
        console.error('[GET /api/bookings/[id]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération.' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    try {
        const { id } = await params
        const bookingId = parseInt(id)
        if (isNaN(bookingId)) {
            return NextResponse.json({ error: 'ID de réservation invalide.' }, { status: 400 })
        }

        let body: { cancelReason?: string } = {}
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { cancelReason } = body
        if (!cancelReason?.trim()) {
            return NextResponse.json({ error: 'Le motif d\'annulation est obligatoire.' }, { status: 400 })
        }

        const booking = await prisma.booking.findUnique({
            where: { bookingId }
        })

        if (!booking) {
            return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
        }

        // Seul l'auteur de la réservation ou un admin peut annuler
        if (booking.userId !== session.userId && session.roleName !== 'admin') {
            return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
        }

        if (booking.status === 'annulee' || booking.status === 'refusee') {
            return NextResponse.json({
                error: `Cette réservation ne peut plus être annulée (statut actuel : ${booking.status}).`
            }, { status: 409 })
        }

        // Une réservation déjà passée (date antérieure à aujourd'hui) ne peut plus être annulée
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const bookingDay = new Date(booking.bookingDate)
        bookingDay.setHours(0, 0, 0, 0)

        if (bookingDay < today) {
            return NextResponse.json({
                error: 'Vous ne pouvez pas annuler une réservation passée.'
            }, { status: 400 })
        }

        // Mettre à jour le statut en 'annulee' et enregistrer log + notifications
        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { bookingId },
                data: {
                    status: 'annulee',
                    cancelledAt: new Date(),
                    cancelReason: cancelReason.trim()
                }
            })

            const dbAction = await tx.action.upsert({
                where: { name: 'RESERVATION_ANNULEE' },
                update: {},
                create: {
                    name: 'RESERVATION_ANNULEE',
                    description: 'Annulation d\'une réservation par l\'utilisateur.'
                }
            })

            const log = await tx.log.create({
                data: {
                    actionId: dbAction.actionId,
                    userId: session.userId,
                    details: `Réservation #${bookingId} annulée par ${session.username}. Motif: ${cancelReason.trim()}`
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

            return { updated, emailNotificationId: emailNotif.notificationId }
        })

        // Envoi d'email asynchrone (non-bloquant)
        processEmailNotification(result.emailNotificationId).catch(err => {
            console.error(`[DELETE /api/bookings/[id]] Failed to process email notification #${result.emailNotificationId}:`, err)
        })

        return NextResponse.json({ success: true, booking: result.updated })
    } catch (error) {
        console.error('[DELETE /api/bookings/[id]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de l\'annulation.' },
            { status: 500 }
        )
    }
}
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
        const bookingId = parseInt(id)
        if (isNaN(bookingId)) {
            return NextResponse.json({ error: 'ID de réservation invalide.' }, { status: 400 })
        }

        let body: { action?: string; cancelReason?: string } = {}
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { action, cancelReason } = body

        if (action !== 'cancel') {
            return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 })
        }

        if (!cancelReason?.trim()) {
            return NextResponse.json({ error: 'Le motif d\'annulation est obligatoire.' }, { status: 400 })
        }

        const booking = await prisma.booking.findUnique({
            where: { bookingId }
        })

        if (!booking) {
            return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
        }

        // Seul l'auteur de la réservation ou un admin peut annuler
        if (booking.userId !== session.userId && session.roleName !== 'admin') {
            return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
        }

        if (booking.status === 'annulee' || booking.status === 'refusee') {
            return NextResponse.json({
                error: `Cette réservation ne peut plus être annulée (statut actuel : ${booking.status}).`
            }, { status: 409 })
        }

        // Une réservation déjà passée (date antérieure à aujourd'hui) ne peut plus être annulée
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const bookingDay = new Date(booking.bookingDate)
        bookingDay.setHours(0, 0, 0, 0)

        if (bookingDay < today) {
            return NextResponse.json({
                error: 'Vous ne pouvez pas annuler une réservation passée.'
            }, { status: 400 })
        }

        // Mettre à jour le statut en 'annulee' et enregistrer log + notifications
        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { bookingId },
                data: {
                    status: 'annulee',
                    cancelledAt: new Date(),
                    cancelReason: cancelReason.trim()
                }
            })

            const dbAction = await tx.action.upsert({
                where: { name: 'RESERVATION_ANNULEE' },
                update: {},
                create: {
                    name: 'RESERVATION_ANNULEE',
                    description: 'Annulation d\'une réservation par l\'utilisateur.'
                }
            })

            const log = await tx.log.create({
                data: {
                    actionId: dbAction.actionId,
                    userId: session.userId,
                    details: `Réservation #${bookingId} annulée par ${session.username}. Motif: ${cancelReason.trim()}`
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

            return { updated, emailNotificationId: emailNotif.notificationId }
        })

        // Envoi d'email asynchrone (non-bloquant)
        processEmailNotification(result.emailNotificationId).catch(err => {
            console.error(`[PATCH /api/bookings/[id]] Failed to process email notification #${result.emailNotificationId}:`, err)
        })

        return NextResponse.json({ success: true, booking: result.updated })
    } catch (error) {
        console.error('[PATCH /api/bookings/[id]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de l\'annulation.' },
            { status: 500 }
        )
    }
}


