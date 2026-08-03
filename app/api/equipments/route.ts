import { prisma } from '../../lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        let equipments = await prisma.equipment.findMany({
            orderBy: { name: 'asc' }
        })

        // Auto-seed basic equipments if catalog is empty
        if (equipments.length === 0) {
            try {
                await prisma.equipment.createMany({
                    data: [
                        { name: 'Vidéoprojecteur' },
                        { name: 'Ordinateur' },
                        { name: 'Sono' },
                        { name: 'Tableau blanc' }
                    ],
                    skipDuplicates: true
                })
                equipments = await prisma.equipment.findMany({
                    orderBy: { name: 'asc' }
                })
            } catch (seedErr) {
                console.error('[GET /api/equipments] Auto-seeding failed:', seedErr)
            }
        }

        return NextResponse.json({ equipments })
    } catch (error) {
        console.error('[GET /api/equipments]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération des équipements.' },
            { status: 500 }
        )
    }
}
