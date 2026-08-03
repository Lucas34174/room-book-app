import { prisma } from '../../../../../lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '../../../../../lib/auth-helpers'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; equipmentId: string }> }
) {
    const guard = await requireAdmin()
    if (guard) return guard
    try {
        const { id, equipmentId } = await params
        const roomId = parseInt(id)
        const parsedEquipmentId = parseInt(equipmentId)

        if (isNaN(roomId) || isNaN(parsedEquipmentId)) {
            return NextResponse.json({ error: 'IDs invalides.' }, { status: 400 })
        }

        // Check if association exists
        const exists = await prisma.roomEquipment.findUnique({
            where: {
                roomId_equipmentId: {
                    roomId,
                    equipmentId: parsedEquipmentId
                }
            }
        })

        if (!exists) {
            return NextResponse.json({ error: 'Association introuvable.' }, { status: 404 })
        }

        // Delete association
        await prisma.roomEquipment.delete({
            where: {
                roomId_equipmentId: {
                    roomId,
                    equipmentId: parsedEquipmentId
                }
            }
        })

        return NextResponse.json({ success: true, message: 'Équipement retiré de la salle.' })
    } catch (error) {
        console.error('[DELETE /api/rooms/[id]/equipments/[equipmentId]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la suppression.' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string; equipmentId: string }> }
) {
    const guard = await requireAdmin()
    if (guard) return guard
    try {
        const { id, equipmentId } = await params
        const roomId = parseInt(id)
        const parsedEquipmentId = parseInt(equipmentId)

        if (isNaN(roomId) || isNaN(parsedEquipmentId)) {
            return NextResponse.json({ error: 'IDs invalides.' }, { status: 400 })
        }

        let body: { usable?: boolean }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        if (body.usable === undefined || typeof body.usable !== 'boolean') {
            return NextResponse.json({ error: 'Le champ usable (booléen) est requis.' }, { status: 400 })
        }

        // Check if association exists
        const exists = await prisma.roomEquipment.findUnique({
            where: {
                roomId_equipmentId: {
                    roomId,
                    equipmentId: parsedEquipmentId
                }
            }
        })

        if (!exists) {
            return NextResponse.json({ error: 'Association introuvable.' }, { status: 404 })
        }

        const updated = await prisma.roomEquipment.update({
            where: {
                roomId_equipmentId: {
                    roomId,
                    equipmentId: parsedEquipmentId
                }
            },
            data: { usable: body.usable },
            include: { equipment: true }
        })

        return NextResponse.json({
            success: true,
            equipment: {
                equipmentId: updated.equipmentId,
                name: updated.equipment.name,
                quantity: updated.quantity,
                usable: updated.usable
            }
        })
    } catch (error) {
        console.error('[PATCH /api/rooms/[id]/equipments/[equipmentId]]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la mise à jour.' },
            { status: 500 }
        )
    }
}