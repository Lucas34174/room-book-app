import { prisma } from '../../lib/prisma'
import { NextResponse } from 'next/server'
import { getSession } from '../../lib/auth-helpers'
import { processEmailNotification } from '../../lib/notifications'
import { Prisma } from '../../generated/prisma/client'

// Helper to format Date objects returned by Prisma for @db.Time() into "HH:MM"
function formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

// Helper to get time in milliseconds since epoch on dummy date 1970-01-01 in UTC
function getUtcTimeMs(date: Date): number {
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    return new Date(`1970-01-01T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`).getTime()
}


export async function POST(request: Request) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Vous devez être connecté pour réserver.' }, { status: 401 })
    }

    // Le Service Validateur ne peut pas créer de réservations, il traite celles des autres
    if (session.roleName === 'validator') {
        return NextResponse.json(
            { error: 'Le Service Validateur ne peut pas effectuer de réservations.' },
            { status: 403 }
        )
    }

    try {
        let body: {
            periodId?: number
            bookingDate?: string // YYYY-MM-DD
            bookingReason?: string
            startTime?: string // HH:MM
            endTime?: string // HH:MM
        }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { periodId, bookingDate, bookingReason, startTime, endTime } = body

        if (!periodId || !bookingDate || !bookingReason?.trim()) {
            return NextResponse.json(
                { error: 'Le créneau, la date et le motif de réservation sont requis.' },
                { status: 400 }
            )
        }

        const dateObj = new Date(bookingDate + 'T00:00:00.000Z')
        if (isNaN(dateObj.getTime())) {
            return NextResponse.json({ error: 'Format de date invalide.' }, { status: 400 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (dateObj < today) {
            return NextResponse.json({ error: 'Vous ne pouvez pas réserver dans le passé.' }, { status: 400 })
        }

        // Récupérer les détails de l'utilisateur (pour l'email)
        const userDetails = await prisma.user.findUnique({
            where: { userId: session.userId },
            select: { email: true }
        })

        if (!userDetails) {
            return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
        }

        // Vérifier si le créneau existe
        const period = await prisma.period.findUnique({
            where: { periodId },
            include: { room: true }
        })

        if (!period) {
            return NextResponse.json({ error: 'Créneau introuvable.' }, { status: 404 })
        }

        if (startTime) {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            if (!timeRegex.test(startTime)) {
                return NextResponse.json({ error: 'Format de l’heure de début invalide (attendu HH:MM).' }, { status: 400 })
            }
            const [, minutes] = startTime.split(':').map(Number)
            if (minutes !== 0 && minutes !== 30) {
                return NextResponse.json({ error: 'L’heure de début doit être un multiple de 30 minutes.' }, { status: 400 })
            }
        }
        if (endTime) {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            if (!timeRegex.test(endTime)) {
                return NextResponse.json({ error: 'Format de l’heure de fin invalide (attendu HH:MM).' }, { status: 400 })
            }
            const [, minutes] = endTime.split(':').map(Number)
            if (minutes !== 0 && minutes !== 30) {
                return NextResponse.json({ error: 'L’heure de fin doit être un multiple de 30 minutes.' }, { status: 400 })
            }
        }

        const selectedStartStr = startTime || formatTime(period.timeStart)
        const selectedEndStr = endTime || formatTime(period.timeEnd)

        const selectedStartMs = new Date(`1970-01-01T${selectedStartStr}:00.000Z`).getTime()
        const selectedEndMs = new Date(`1970-01-01T${selectedEndStr}:00.000Z`).getTime()

        const periodStartMs = getUtcTimeMs(period.timeStart)
        const periodEndMs = getUtcTimeMs(period.timeEnd)

        if (selectedStartMs < periodStartMs || selectedEndMs > periodEndMs) {
            return NextResponse.json({ error: 'La réservation doit être comprise dans les limites du créneau.' }, { status: 400 })
        }

        if (selectedEndMs <= selectedStartMs) {
            return NextResponse.json({ error: 'L’heure de fin doit être strictement supérieure à l’heure de début.' }, { status: 400 })
        }

        // Vérifier si la date et l'heure de début du créneau sont déjà passées
        const [selStartH, selStartM] = selectedStartStr.split(':').map(Number)
        const reservationStartUtc = new Date(bookingDate + `T${selStartH.toString().padStart(2, '0')}:${selStartM.toString().padStart(2, '0')}:00.000Z`)

        if (reservationStartUtc < new Date()) {
            return NextResponse.json(
                { error: 'L’heure de début de cette réservation est déjà passée. Il est impossible de la réserver.' },
                { status: 400 }
            )
        }

        if (!period.room.bookable) {
            return NextResponse.json({ error: 'Cette salle est temporairement indisponible à la réservation.' }, { status: 400 })
        }

        // Le jour de la semaine doit correspondre au créneau
        const jsDay = dateObj.getDay()
        const dayOfWeekVal = jsDay === 0 ? -1 : jsDay
        if (period.dayOfWeek !== dayOfWeekVal) {
            return NextResponse.json({ error: 'Le créneau sélectionné ne correspond pas au jour de la date choisie.' }, { status: 400 })
        }

        // Rôle de l'utilisateur
        const isPriorityUser = session.roleName === 'admin' || session.roleName === 'teacher'
        const initialStatus = isPriorityUser ? 'confirmee' : 'en_attente'

        // Logique anti-conflit dans une transaction Serializable pour éviter la concurrence
        const result = await prisma.$transaction(async (tx) => {
            // 1. Vérifier s'il y a déjà une réservation CONFIRMÉE sur ce créneau et ce jour
            // avec laquelle les horaires sélectionnés chevauchent.
            const confirmedBookings = await tx.booking.findMany({
                where: {
                    periodId,
                    bookingDate: dateObj,
                    status: 'confirmee'
                }
            })

            for (const existing of confirmedBookings) {
                const existingStartMs = getUtcTimeMs(existing.startTime)
                const existingEndMs = getUtcTimeMs(existing.endTime)

                // Overlap check formula: (startA < endB) && (endA > startB)
                if (selectedStartMs < existingEndMs && selectedEndMs > existingStartMs) {
                    throw new Error('CONFLIT_CONFIRME')
                }
            }

            // 2. Si l'utilisateur est prioritaire (Enseignant/Admin), sa réservation est directe.
            // On doit annuler/refuser toutes les demandes en attente sur ce créneau pour ce jour.
            let overwrittenBookingsCount = 0
            const emailNotificationsToProcess: number[] = []

            if (isPriorityUser) {
                // Trouver les réservations en attente
                const pendingBookings = await tx.booking.findMany({
                    where: {
                        periodId,
                        bookingDate: dateObj,
                        status: 'en_attente'
                    }
                })

                const overlappingPending = pendingBookings.filter(pb => {
                    const pbStartMs = getUtcTimeMs(pb.startTime)
                    const pbEndMs = getUtcTimeMs(pb.endTime)
                    return selectedStartMs < pbEndMs && selectedEndMs > pbStartMs
                })

                if (overlappingPending.length > 0) {
                    overwrittenBookingsCount = overlappingPending.length
                    
                    const action = await tx.action.upsert({
                        where: { name: 'RESERVATION_PRIORITAIRE' },
                        update: {},
                        create: {
                            name: 'RESERVATION_PRIORITAIRE',
                            description: 'Demande refusée car écrasée par une réservation prioritaire.'
                        }
                    })

                    // Mettre à jour chaque demande individuellement pour lier les logs et notifications
                    for (const pb of overlappingPending) {
                        await tx.booking.update({
                            where: { bookingId: pb.bookingId },
                            data: {
                                status: 'refusee',
                                refusalReason: 'Un enseignant ou administrateur a effectué une réservation prioritaire sur ce créneau.'
                            }
                        })

                        const log = await tx.log.create({
                            data: {
                                actionId: action.actionId,
                                userId: session.userId,
                                details: `La demande de réservation #${pb.bookingId} de l'utilisateur #${pb.userId} a été écrasée par la réservation prioritaire de ${session.username}.`
                            }
                        })

                        // Notification In-App pour l'étudiant
                        await tx.notification.create({
                            data: {
                                logId: log.logId,
                                bookingId: pb.bookingId,
                                type: 'IN_APP', status: 'PENDING'
                            }
                        })

                        // Notification Email pour l'étudiant
                        const emailNotif = await tx.notification.create({
                            data: {
                                logId: log.logId,
                                bookingId: pb.bookingId,
                                type: 'EMAIL',
                                status: 'PENDING'
                            }
                        })
                        emailNotificationsToProcess.push(emailNotif.notificationId)
                    }
                }
            }

            // 3. Créer la réservation
            const newBooking = await tx.booking.create({
                data: {
                    userId: session.userId,
                    periodId,
                    bookingDate: dateObj,
                    startTime: new Date(`1970-01-01T${selectedStartStr}:00.000Z`),
                    endTime: new Date(`1970-01-01T${selectedEndStr}:00.000Z`),
                    status: initialStatus as any,
                    bookingReason: bookingReason.trim()
                }
            })

            // 4. Logs et Notifications pour la création
            const actionName = initialStatus === 'confirmee' ? 'RESERVATION_CONFIRMEE' : 'RESERVATION_CREEE'
            const actionDesc = initialStatus === 'confirmee' 
                ? 'Confirmation immédiate d\'une réservation de salle.'
                : 'Soumission d\'une demande de réservation en attente.'

            const actionConf = await tx.action.upsert({
                where: { name: actionName },
                update: {},
                create: {
                    name: actionName,
                    description: actionDesc
                }
            })

            const logConf = await tx.log.create({
                data: {
                    actionId: actionConf.actionId,
                    userId: session.userId,
                    details: initialStatus === 'confirmee'
                        ? `Réservation confirmée pour ${session.username} - Salle: ${period.room.name}, Date: ${bookingDate}`
                        : `Demande de réservation soumise par ${session.username} - Salle: ${period.room.name}, Date: ${bookingDate}`
                }
            })

            // Notification In-App
            await tx.notification.create({
                data: {
                    logId: logConf.logId,
                    bookingId: newBooking.bookingId,
                    type: 'IN_APP', status: 'PENDING'
                }
            })

            // Notification Email
            const emailNotif = await tx.notification.create({
                data: {
                    logId: logConf.logId,
                    bookingId: newBooking.bookingId,
                    type: 'EMAIL',
                    status: 'PENDING'
                }
            })
            emailNotificationsToProcess.push(emailNotif.notificationId)

            return { newBooking, overwrittenBookingsCount, emailNotificationsToProcess }
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        })

        // Envoi des emails asynchrones en tâche de fond (processus non-bloquant)
        result.emailNotificationsToProcess.forEach((notifId) => {
            processEmailNotification(notifId).catch(err => {
                console.error(`[POST /api/bookings] Failed to process email notification #${notifId}:`, err)
            })
        })


        return NextResponse.json({
            success: true,
            booking: result.newBooking,
            overwrittenBookingsCount: result.overwrittenBookingsCount,
            message: initialStatus === 'confirmee'
                ? 'Réservation confirmée immédiatement.'
                : 'Demande de réservation enregistrée et en attente de validation.'
        }, { status: 201 })

    } catch (error: any) {
        if (error.message === 'CONFLIT_CONFIRME') {
            return NextResponse.json(
                { error: 'Ce créneau n\'est plus disponible (déjà réservé).' },
                { status: 409 }
            )
        }

        // Si PostgreSQL détecte un conflit de sérialisation (code 40001)
        if (error.code === 'P2034' || error.message?.includes('serialization')) {
            return NextResponse.json(
                { error: 'Conflit de réservation simultanée. Veuillez réessayer.' },
                { status: 409 }
            )
        }

        console.error('[POST /api/bookings]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de l\'enregistrement de la réservation.' },
            { status: 500 }
        )
    }
}

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    try {
        const bookings = await prisma.booking.findMany({
            where: { userId: session.userId },
            include: {
                period: {
                    include: { room: true }
                }
            },
            orderBy: [
                { bookingDate: 'desc' },
                { startTime: 'desc' }
            ]
        })

        const formatted = bookings.map((b) => ({
            bookingId: b.bookingId,
            bookingDate: b.bookingDate.toISOString().split('T')[0],
            status: b.status,
            bookingReason: b.bookingReason,
            cancelReason: b.cancelReason,
            refusalReason: b.refusalReason,
            roomName: b.period.room.name,
            roomId: b.period.roomId,
            location: b.period.room.location,
            timeStart: formatTime(b.period.timeStart),
            timeEnd: formatTime(b.period.timeEnd),
        }))

        return NextResponse.json({ bookings: formatted })
    } catch (error) {
        console.error('[GET /api/bookings]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération de vos réservations.' },
            { status: 500 }
        )
    }
}

