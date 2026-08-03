import { prisma } from '../../lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '../../lib/auth-helpers'

export async function GET() {
    const guard = await requireAdmin()
    if (guard) return guard
    try {
        const rooms = await prisma.room.findMany({
            orderBy: { name: 'asc' }
        })
        return NextResponse.json({ rooms })
    } catch (error) {
        console.error('[GET /api/rooms]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération des salles.' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    const guard = await requireAdmin()
    if (guard) return guard
    try {
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

        if (!name?.trim() || capacity === undefined || !location?.trim()) {
            return NextResponse.json(
                { error: 'Le nom, la capacité et la localisation sont requis.' },
                { status: 400 }
            )
        }

        const parsedCapacity = parseInt(String(capacity))
        if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
            return NextResponse.json(
                { error: 'La capacité doit être un nombre positif.' },
                { status: 400 }
            )
        }

        const room = await prisma.room.create({
            data: {
                name: name.trim(),
                capacity: parsedCapacity,
                location: location.trim(),
                description: description?.trim() || null,
                bookable: bookable !== undefined ? bookable : true
            }
        })

        return NextResponse.json({ success: true, room }, { status: 201 })
    } catch (error) {
        console.error('[POST /api/rooms]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la création de la salle.' },
            { status: 500 }
        )
    }
}
