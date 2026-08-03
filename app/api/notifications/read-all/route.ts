import { prisma } from '../../../lib/prisma'
import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth-helpers'

export async function POST() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    try {
        const isValidator = session.roleName === 'admin' || session.roleName === 'validator'

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
                status: 'PENDING',
                OR: orConditions
            },
            select: {
                notificationId: true
            }
        })

        const ids = notifications.map(n => n.notificationId)

        if (ids.length > 0) {
            await prisma.notification.updateMany({
                where: {
                    notificationId: { in: ids }
                },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            })
        }

        return NextResponse.json({ success: true, count: ids.length })
    } catch (error) {
        console.error('[POST /api/notifications/read-all]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la mise à jour globale.' },
            { status: 500 }
        )
    }
}
