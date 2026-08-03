import { prisma } from '../../../../../lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '../../../../../lib/auth-helpers'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; periodId: string }> }
) {
    const guard = await requireAdmin()
    if (guard) return guard
    try {
        const { id, periodId } = await params
        const roomId = parseInt(id)
        const parsedPeriodId = parseInt(periodId)

        if (isNaN(roomId) || isNaN(parsedPeriodId)) {
            return NextResponse.json({ error: 'IDs invalides.' }, { status: 400 })
        }

        // Check if period exists
        const period = await prisma.period.findFirst({
            where: {
                periodId: parsedPeriodId,
                roomId
            }
        })

        if (!period) {
            return NextResponse.json({ error: 'Créneau introuvable.' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const force = searchParams.get('force') === 'true'

        // Check active bookings
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const activeBookingsCount = await prisma.booking.count({
            where: {
                periodId: parsedPeriodId,
                bookingDate: {
                    gte: today
                },
                status: {
                    in: ['en_attente', 'confirmee']
                }
            }
        })

        if (activeBookingsCount > 0 && !force) {
            return NextResponse.json(
                {
                    error: 'Ce créneau a des réservations actives.',
                    activeBookingsCount,
                    requiresConfirmation: true
                },
                { status: 409 }
            )
        }

        // Transaction cascade delete
        await prisma.$transaction(async (tx) => {
            // Delete bookings first
            await tx.booking.deleteMany({
                where: { periodId: parsedPeriodId }
            })

            // Delete period
            await tx.period.delete({
                where: { periodId: parsedPeriodId }
            })
        })

        return NextResponse.json({ success: true, message: 'Créneau supprimé avec succès.' })
    } catch (error) {
        console.error('[DELETE /api/rooms/[id]/periods/[periodId]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la suppression du créneau.' },
            { status: 500 }
        )
    }
}
