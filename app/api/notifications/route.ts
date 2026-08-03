import { prisma } from '../../lib/prisma'
import { NextResponse } from 'next/server'
import { getSession } from '../../lib/auth-helpers'

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    try {
        const isValidator = session.roleName === 'admin' || session.roleName === 'validator'

        // Conditions typées pour contourner les restrictions strictes
        const orConditions: any[] = [
            {
                booking: {
                    userId: session.userId
                }
            }
        ]

        if (isValidator) {
            orConditions.push({
                bookingId: null
            })
            orConditions.push({
                booking: {
                    status: 'en_attente'
                }
            })
        }

        const notifications = await prisma.notification.findMany({
            where: {
                type: 'IN_APP',
                OR: orConditions
            },
            include: {
                log: {
                    include: {
                        action: true
                    }
                },
                booking: {
                    include: {
                        period: {
                            include: { room: true }
                        }
                    }
                }
            },
            orderBy: {
                notificationId: 'desc'
            }
        })

        const formatted = notifications.map((n: any) => {
            let message = n.log.details
            let targetUrl = '/reservations'

            const actionName = n.log.action.name
            if (actionName === 'INSCRIPTION_COMPTE') {
                targetUrl = '/utilisateurs'
                message = n.log.details
            } else if (actionName === 'RESERVATION_CREEE' && isValidator) {
                targetUrl = '/demandes'
                message = `Nouvelle demande de réservation pour la salle ${n.booking?.period?.room?.name || ''} en attente.`
            } else if (actionName === 'RESERVATION_VALIDEE') {
                targetUrl = '/reservations'
            } else if (actionName === 'RESERVATION_REFUSEE') {
                targetUrl = '/reservations'
            } else if (actionName === 'RESERVATION_ANNULEE' && isValidator) {
                targetUrl = '/demandes'
            }

            return {
                notificationId: n.notificationId,
                message,
                status: n.status,
                createdAt: n.log.createdAt.toISOString(),
                targetUrl
            }
        })

        const unreadCount = formatted.filter(n => n.status === 'PENDING').length

        return NextResponse.json({ notifications: formatted, unreadCount })
    } catch (error) {
        console.error('[GET /api/notifications]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération des notifications.' },
            { status: 500 }
        )
    }
}
