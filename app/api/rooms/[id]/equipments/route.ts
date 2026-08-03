import { prisma } from '../../../../lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '../../../../lib/auth-helpers'

export async function GET(
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

        const roomEquipments = await prisma.roomEquipment.findMany({
            where: { roomId },
            include: {
                equipment: true
            },
            orderBy: {
                equipment: {
                    name: 'asc'
                }
            }
        })

        const formatted = roomEquipments.map((re) => ({
            equipmentId: re.equipmentId,
            name: re.equipment.name,
            quantity: re.quantity,
            usable: re.usable
        }))

        return NextResponse.json({ equipments: formatted })
    } catch (error) {
        console.error('[GET /api/rooms/[id]/equipments]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération des équipements.' },
            { status: 500 }
        )
    }
}

export async function POST(
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

        let body: {
            equipmentId?: string | number
            quantity?: string | number
            usable?: boolean
        }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { equipmentId, quantity, usable } = body

        if (equipmentId === undefined || quantity === undefined) {
            return NextResponse.json(
                { error: 'L’équipement et la quantité sont requis.' },
                { status: 400 }
            )
        }

        const parsedEquipmentId = parseInt(String(equipmentId))
        const parsedQuantity = parseInt(String(quantity))

        if (isNaN(parsedEquipmentId) || isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return NextResponse.json(
                { error: 'Données d’équipement ou de quantité invalides.' },
                { status: 400 }
            )
        }

        // Verify if room exists
        const room = await prisma.room.findUnique({ where: { roomId } })
        if (!room) {
            return NextResponse.json({ error: 'Salle introuvable.' }, { status: 404 })
        }

        // Verify if equipment exists in catalog
        const equipment = await prisma.equipment.findUnique({ where: { equipmentId: parsedEquipmentId } })
        if (!equipment) {
            return NextResponse.json({ error: 'Équipement introuvable.' }, { status: 404 })
        }

        // Upsert association
        const roomEquipment = await prisma.roomEquipment.upsert({
            where: {
                roomId_equipmentId: {
                    roomId,
                    equipmentId: parsedEquipmentId
                }
            },
            update: {
                quantity: parsedQuantity,
                usable: usable !== undefined ? usable : true
            },
            create: {
                roomId,
                equipmentId: parsedEquipmentId,
                quantity: parsedQuantity,
                usable: usable !== undefined ? usable : true
            },
            include: {
                equipment: true
            }
        })

        return NextResponse.json({
            success: true,
            equipment: {
                equipmentId: roomEquipment.equipmentId,
                name: roomEquipment.equipment.name,
                quantity: roomEquipment.quantity,
                usable: roomEquipment.usable
            }
        })
    } catch (error) {
        console.error('[POST /api/rooms/[id]/equipments]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de l’association de l’équipement.' },
            { status: 500 }
        )
    }
}
