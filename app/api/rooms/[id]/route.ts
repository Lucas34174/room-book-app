import { prisma } from '../../../lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin, requireAuth } from '../../../lib/auth-helpers'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Accessible à tout utilisateur connecté (nécessaire pour la page réservation/ajouter)
    const guard = await requireAuth()
    if (guard) return guard
    try {
        const { id } = await params
        const roomId = parseInt(id)
        if (isNaN(roomId)) {
            return NextResponse.json({ error: 'ID salle invalide.' }, { status: 400 })
        }

        const room = await prisma.room.findUnique({
            where: { roomId }
        })

        if (!room) {
            return NextResponse.json({ error: 'Salle introuvable.' }, { status: 404 })
        }

        return NextResponse.json({ room })
    } catch (error) {
        console.error('[GET /api/rooms/[id]]', error)
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
    try {
        const { id } = await params
        const roomId = parseInt(id)
        if (isNaN(roomId)) {
            return NextResponse.json({ error: 'ID salle invalide.' }, { status: 400 })
        }

        let body: {
            name?: string
            capacity?: string | number
            location?: string
            description?: string | null
            bookable?: boolean
        }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { name, capacity, location, description, bookable } = body

        const roomExists = await prisma.room.findUnique({ where: { roomId } })
        if (!roomExists) {
            return NextResponse.json({ error: 'Salle introuvable.' }, { status: 404 })
        }

        const dataToUpdate: any = {}
        if (name !== undefined) dataToUpdate.name = name.trim()
        if (location !== undefined) dataToUpdate.location = location.trim()
        if (description !== undefined) dataToUpdate.description = description?.trim() || null
        if (bookable !== undefined) dataToUpdate.bookable = bookable

        if (capacity !== undefined) {
            const parsedCapacity = parseInt(String(capacity))
            if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
                return NextResponse.json(
                    { error: 'La capacité doit être un nombre positif.' },
                    { status: 400 }
                )
            }
            dataToUpdate.capacity = parsedCapacity
        }

        const updatedRoom = await prisma.room.update({
            where: { roomId },
            data: dataToUpdate
        })

        return NextResponse.json({ success: true, room: updatedRoom })
    } catch (error) {
        console.error('[PUT /api/rooms/[id]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la mise à jour.' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const roomId = parseInt(id)
        if (isNaN(roomId)) {
            return NextResponse.json({ error: 'ID salle invalide.' }, { status: 400 })
        }

        const room = await prisma.room.findUnique({ where: { roomId } })
        if (!room) {
            return NextResponse.json({ error: 'Salle introuvable.' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const force = searchParams.get('force') === 'true'

        // Check if there are active bookings (in the future or today, and not cancelled/refused)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const activeBookingsCount = await prisma.booking.count({
            where: {
                period: {
                    roomId: roomId
                },
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
                    error: 'Cette salle a des réservations actives.',
                    activeBookingsCount,
                    requiresConfirmation: true
                },
                { status: 409 }
            )
        }

        // Cascade delete using a transaction to avoid Restrict constraint failure
        await prisma.$transaction(async (tx) => {
            const periods = await tx.period.findMany({
                where: { roomId },
                select: { periodId: true }
            })
            const periodIds = periods.map(p => p.periodId)

            if (periodIds.length > 0) {
                // Delete bookings for these periods first
                await tx.booking.deleteMany({
                    where: { periodId: { in: periodIds } }
                })
            }

            // Delete room equipments
            await tx.roomEquipment.deleteMany({
                where: { roomId }
            })

            // Delete the room (this will cascade delete periods)
            await tx.room.delete({
                where: { roomId }
            })
        })

        return NextResponse.json({ success: true, message: 'Salle supprimée avec succès.' })
    } catch (error) {
        console.error('[DELETE /api/rooms/[id]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la suppression de la salle.' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireAdmin()
    if (guard) return guard
    try {
        const { id } = await params
        const roomId = parseInt(id)
        if (isNaN(roomId)) {
            return NextResponse.json({ error: 'ID salle invalide.' }, { status: 400 })
        }

        let body: { bookable?: boolean }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        if (body.bookable === undefined || typeof body.bookable !== 'boolean') {
            return NextResponse.json({ error: 'Le champ bookable (booléen) est requis.' }, { status: 400 })
        }

        const room = await prisma.room.findUnique({ where: { roomId } })
        if (!room) {
            return NextResponse.json({ error: 'Salle introuvable.' }, { status: 404 })
        }

        const updated = await prisma.room.update({
            where: { roomId },
            data: { bookable: body.bookable }
        })

        return NextResponse.json({ success: true, room: updated })
    } catch (error) {
        console.error('[PATCH /api/rooms/[id]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la mise à jour.' },
            { status: 500 }
        )
    }
}
