import { prisma } from '../../lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '../../lib/auth-helpers'

// Helper to format Date objects returned by Prisma for @db.Time() into "HH:MM"
function formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

const DAY_LABELS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export async function GET(request: Request) {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Dates par défaut (30 derniers jours)
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam ? new Date(startDateParam) : new Date()
    if (!startDateParam) {
        startDate.setDate(endDate.getDate() - 30)
    }

    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Format de date invalide.' }, { status: 400 })
    }

    try {
        // 1. Récupérer toutes les salles
        const rooms = await prisma.room.findMany({
            include: {
                periods: true
            }
        })

        // 2. Récupérer toutes les réservations confirmées sur la période
        const bookings = await prisma.booking.findMany({
            where: {
                status: 'confirmee',
                bookingDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                period: {
                    include: {
                        room: true
                    }
                }
            }
        })

        // 3. Calculer les créneaux disponibles par salle sur la période
        // On parcourt chaque jour du calendrier entre startDate et endDate
        const dateCounts: Record<number, number> = {} // dayOfWeek (1-7) -> nombre d'occurrences sur la période
        const temp = new Date(startDate)
        while (temp <= endDate) {
            let dayOfWeek = temp.getDay() // 0 = Dimanche, 1 = Lundi...
            // Adapter au format 1 (Lundi) ... 6 (Samedi), 7 (Dimanche)
            if (dayOfWeek === 0) dayOfWeek = 7
            
            dateCounts[dayOfWeek] = (dateCounts[dayOfWeek] || 0) + 1
            temp.setDate(temp.getDate() + 1)
        }

        const roomStats = rooms.map(room => {
            // Nombre de créneaux théoriquement disponibles
            let totalAvailableSlots = 0
            room.periods.forEach(p => {
                const occurrences = dateCounts[p.dayOfWeek] || 0
                totalAvailableSlots += occurrences
            })

            // Nombre de réservations réelles pour cette salle
            const roomBookings = bookings.filter(b => b.period.roomId === room.roomId)
            const bookingsCount = roomBookings.length

            const occupancyRate = totalAvailableSlots > 0 
                ? Math.round((bookingsCount / totalAvailableSlots) * 100) 
                : 0

            return {
                roomId: room.roomId,
                roomName: room.name,
                location: room.location,
                capacity: room.capacity,
                totalAvailableSlots,
                bookingsCount,
                occupancyRate
            }
        })

        // 4. Créneaux les plus demandés
        const periodCounts: Record<string, {
            roomName: string
            dayOfWeek: number
            timeStart: string
            timeEnd: string
            count: number
        }> = {}

        bookings.forEach(b => {
            const key = `${b.period.roomId}-${b.period.dayOfWeek}-${b.period.timeStart.getTime()}`
            if (!periodCounts[key]) {
                periodCounts[key] = {
                    roomName: b.period.room.name,
                    dayOfWeek: b.period.dayOfWeek,
                    timeStart: formatTime(b.period.timeStart),
                    timeEnd: formatTime(b.period.timeEnd),
                    count: 0
                }
            }
            periodCounts[key].count++
        })

        const popularPeriods = Object.values(periodCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10) // Top 10

        return NextResponse.json({
            period: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            },
            roomStats,
            popularPeriods
        })

    } catch (error) {
        console.error('[GET /api/stats]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors du calcul des statistiques.' },
            { status: 500 }
        )
    }
}
