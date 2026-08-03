import { prisma } from '../../../lib/prisma'
import { NextResponse } from 'next/server'

// Helper to get time in milliseconds from a Prisma Time Date
function getUtcTimeMs(date: Date): number {
    return date.getUTCHours() * 3600000 + date.getUTCMinutes() * 60000
}

// Helper to parse "HH:MM" string to milliseconds
function timeStringToMs(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 3600000 + m * 60000
}

// Map JS getDay() (0=Sun, 1=Mon, ..., 6=Sat) to our schema (1=Mon, ..., 6=Sat)
function getDayOfWeek(date: Date): number {
    const jsDay = date.getDay() // 0=Sun, 1=Mon, 6=Sat
    if (jsDay === 0) return -1 // Sunday is not reservable
    return jsDay // Mon=1, Tue=2, ..., Sat=6
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        const minCapacityParam = searchParams.get('minCapacity')
        const nameParam = searchParams.get('name')          
        const dateParam = searchParams.get('date')           // format: YYYY-MM-DD
        const timeStartParam = searchParams.get('timeStart') // format: HH:MM
        const timeEndParam = searchParams.get('timeEnd')     // format: HH:MM
        const equipmentIdsParam = searchParams.get('equipmentIds') // comma-separated

        // -- Validations --
        const minCapacity = minCapacityParam ? parseInt(minCapacityParam) : null
        if (minCapacityParam && (isNaN(minCapacity!) || minCapacity! <= 0)) {
            return NextResponse.json({ error: 'La capacité minimum doit être un nombre positif.' }, { status: 400 })
        }

        let searchDate: Date | null = null
        let dayOfWeek: number | null = null
        if (dateParam) {
            searchDate = new Date(dateParam + 'T00:00:00.000Z')
            if (isNaN(searchDate.getTime())) {
                return NextResponse.json({ error: 'Format de date invalide (attendu YYYY-MM-DD).' }, { status: 400 })
            }
            dayOfWeek = getDayOfWeek(searchDate)
            if (dayOfWeek === -1) {
                return NextResponse.json({
                    rooms: [],
                    message: "Aucun créneau n'est disponible le dimanche.",
                    total: 0
                })
            }
        }

        let searchStartMs: number | null = null
        let searchEndMs: number | null = null
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (timeStartParam && timeEndParam) {
            if (!timeRegex.test(timeStartParam) || !timeRegex.test(timeEndParam)) {
                return NextResponse.json({ error: "Format d'heure invalide (attendu HH:MM)." }, { status: 400 })
            }
            searchStartMs = timeStringToMs(timeStartParam)
            searchEndMs = timeStringToMs(timeEndParam)
            if (searchEndMs <= searchStartMs) {
                return NextResponse.json({ error: "L'heure de fin doit être après l'heure de début." }, { status: 400 })
            }
        } else if (timeStartParam || timeEndParam) {
            return NextResponse.json({ error: "Veuillez fournir à la fois l'heure de début et l'heure de fin." }, { status: 400 })
        }

        const equipmentIds: number[] = []
        if (equipmentIdsParam) {
            for (const idStr of equipmentIdsParam.split(',')) {
                const parsed = parseInt(idStr.trim())
                if (!isNaN(parsed)) equipmentIds.push(parsed)
            }
        }

        // -- Build the Prisma query --

        // Start from all bookable rooms
        const allRooms = await prisma.room.findMany({
            where: {
                bookable: true,
                ...(minCapacity !== null ? { capacity: { gte: minCapacity } } : {}),
                ...(nameParam?.trim() ? { name: { contains: nameParam.trim(), mode: 'insensitive' } } : {}),
            },
            include: {
                equipments: {
                    include: { equipment: true }
                },
                periods: true
            },
            orderBy: { name: 'asc' }
        })

        // Filter in JS for complex checks (equipment usability + slot availability)
        const results = []

        for (const room of allRooms) {
            // 1. Equipment filter: room must have ALL required equipment, each with usable: true
            if (equipmentIds.length > 0) {
                const hasAll = equipmentIds.every((reqId) => {
                    const re = room.equipments.find(
                        (e) => e.equipmentId === reqId && e.usable === true
                    )
                    return re !== undefined
                })
                if (!hasAll) continue
            }

            // 2. Time/Date slot filter
            if (dayOfWeek !== null && searchStartMs !== null && searchEndMs !== null && searchDate !== null) {
                // Both date and time range provided: check matching periods on that day and avoid conflicts
                const matchingPeriods = room.periods.filter((p) => {
                    if (p.dayOfWeek !== dayOfWeek) return false
                    const periodStartMs = getUtcTimeMs(p.timeStart)
                    const periodEndMs = getUtcTimeMs(p.timeEnd)
                    return periodStartMs <= searchStartMs! && periodEndMs >= searchEndMs!
                })

                if (matchingPeriods.length === 0) continue

                let hasAvailablePeriod = false
                for (const period of matchingPeriods) {
                    const conflictingBookings = await prisma.booking.count({
                        where: {
                            periodId: period.periodId,
                            bookingDate: searchDate,
                            status: { in: ['en_attente', 'confirmee'] }
                        }
                    })
                    if (conflictingBookings === 0) {
                        hasAvailablePeriod = true
                        break
                    }
                }

                if (!hasAvailablePeriod) continue
            } else if (dayOfWeek !== null) {
                // Only date provided: check if room has at least one period on that day
                const hasPeriodOnDay = room.periods.some((p) => p.dayOfWeek === dayOfWeek)
                if (!hasPeriodOnDay) continue
            } else if (searchStartMs !== null && searchEndMs !== null) {
                // Only time range provided: check if room has at least one period covering the range
                const hasMatchingPeriod = room.periods.some((p) => {
                    const periodStartMs = getUtcTimeMs(p.timeStart)
                    const periodEndMs = getUtcTimeMs(p.timeEnd)
                    return periodStartMs <= searchStartMs! && periodEndMs >= searchEndMs!
                })
                if (!hasMatchingPeriod) continue
            }

            // Room passed all filters
            results.push({
                roomId: room.roomId,
                name: room.name,
                capacity: room.capacity,
                location: room.location,
                description: room.description,
                equipments: room.equipments.map((re) => ({
                    equipmentId: re.equipmentId,
                    name: re.equipment.name,
                    usable: re.usable,
                    quantity: re.quantity
                }))
            })
        }

        return NextResponse.json({
            rooms: results,
            total: results.length,
            message: results.length === 0
                ? 'Aucune salle ne correspond aux critères de recherche.'
                : null
        })
    } catch (error) {
        console.error('[GET /api/rooms/search]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la recherche.' },
            { status: 500 }
        )
    }
}
