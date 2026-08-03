import { prisma } from '../../../lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireValidator } from '../../../lib/auth-helpers'

// Helper to format Date objects returned by Prisma for @db.Time() into "HH:MM"
function formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

const VALID_STATUSES = ['en_attente', 'confirmee', 'refusee', 'annulee'] as const
type BookingStatus = typeof VALID_STATUSES[number]

export async function GET(request: NextRequest) {
    const validatorCheck = await requireValidator()
    if (validatorCheck) return validatorCheck

    // Paramètre optionnel ?status=en_attente|confirmee|refusee|annulee
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const where = statusParam && VALID_STATUSES.includes(statusParam as BookingStatus)
        ? { status: statusParam as BookingStatus }
        : {}

    try {
        const bookings = await prisma.booking.findMany({
            where,
            include: {
                period: { include: { room: true } },
                user: {
                    select: {
                        userId: true,
                        firstname: true,
                        lastname: true,
                        username: true,
                        email: true,
                        role: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const formatted = bookings.map((b) => ({
            bookingId: b.bookingId,
            bookingDate: b.bookingDate.toISOString().split('T')[0],
            createdAt: b.createdAt.toISOString(),
            status: b.status,
            bookingReason: b.bookingReason,
            refusalReason: b.refusalReason ?? null,
            cancelReason: b.cancelReason ?? null,
            roomName: b.period.room.name,
            location: b.period.room.location,
            timeStart: formatTime(b.period.timeStart),
            timeEnd: formatTime(b.period.timeEnd),
            requester: {
                userId: b.user.userId,
                name: `${b.user.firstname} ${b.user.lastname}`,
                username: b.user.username,
                role: b.user.role.name
            }
        }))

        return NextResponse.json({ bookings: formatted, total: formatted.length })
    } catch (error) {
        console.error('[GET /api/bookings/pending]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération des demandes.' },
            { status: 500 }
        )
    }
}
