import { prisma } from '../../../../lib/prisma'
import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/auth-helpers'

// Helper to format Date objects returned by Prisma for @db.Time() into "HH:MM"
function formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

function timeToMinutes(date: Date): number {
    return date.getUTCHours() * 60 + date.getUTCMinutes()
}

function minutesToTimeString(m: number): string {
    const h = Math.floor(m / 60)
    const mins = m % 60
    return `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Exiger une session valide pour les utilisateurs connectés
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

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
        const startDateParam = searchParams.get('startDate') // format: YYYY-MM-DD

        let startDate = new Date()
        if (startDateParam) {
            startDate = new Date(startDateParam + 'T00:00:00.000Z')
            if (isNaN(startDate.getTime())) {
                return NextResponse.json({ error: 'Format de date invalide (attendu YYYY-MM-DD).' }, { status: 400 })
            }
        }
        startDate.setHours(0, 0, 0, 0)

        // Générer les 7 jours de la plage
        const days = []
        for (let i = 0; i < 7; i++) {
            const current = new Date(startDate)
            current.setDate(startDate.getDate() + i)
            days.push(current)
        }

        const endDate = new Date(days[6])
        endDate.setHours(23, 59, 59, 999)

        // Récupérer tous les créneaux définis pour cette salle
        const periods = await prisma.period.findMany({
            where: { roomId },
            orderBy: [
                { dayOfWeek: 'asc' },
                { timeStart: 'asc' }
            ]
        })

        // Récupérer toutes les réservations actives (en_attente, confirmee) de la salle dans cet intervalle de 7 jours
        const bookings = await prisma.booking.findMany({
            where: {
                period: { roomId },
                bookingDate: {
                    gte: startDate,
                    lte: endDate
                },
                status: {
                    in: ['en_attente', 'confirmee']
                }
            },
            include: {
                user: {
                    select: {
                        firstname: true,
                        lastname: true,
                        username: true
                    }
                }
            }
        })

        function toLocalISODate(date: Date) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        // Construire la grille d'occupation par jour
        const availabilityGrid = days.map((day) => {
            const jsDay = day.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
            // Mappe 0 (Sun) -> -1 (indisponible), 1-6 -> 1-6
            const dayOfWeekVal = jsDay === 0 ? -1 : jsDay

            // Trouver les créneaux pour ce jour de la semaine
            const dayPeriods = periods.filter(p => p.dayOfWeek === dayOfWeekVal)

            const formattedDate = toLocalISODate(day)

            const slots: any[] = []

            for (const p of dayPeriods) {
                // Trouver toutes les réservations actives pour ce créneau et ce jour
                const periodBookings = bookings.filter(b => {
                    const bDateStr = toLocalISODate(b.bookingDate)
                    return b.periodId === p.periodId && bDateStr === formattedDate
                })

                // Trier par heure de début
                periodBookings.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

                const pStart = timeToMinutes(p.timeStart)
                const pEnd = timeToMinutes(p.timeEnd)

                let freeIntervals: { start: number; end: number }[] = [{ start: pStart, end: pEnd }]

                for (const b of periodBookings) {
                    const bStart = timeToMinutes(b.startTime)
                    const bEnd = timeToMinutes(b.endTime)

                    const nextFree: { start: number; end: number }[] = []
                    for (const f of freeIntervals) {
                        if (bStart >= f.end || bEnd <= f.start) {
                            nextFree.push(f)
                        } else {
                            if (bStart > f.start) {
                                nextFree.push({ start: f.start, end: bStart })
                            }
                            if (bEnd < f.end) {
                                nextFree.push({ start: bEnd, end: f.end })
                            }
                        }
                    }
                    freeIntervals = nextFree
                }

                // Ajouter les créneaux occupés
                for (const b of periodBookings) {
                    slots.push({
                        periodId: p.periodId,
                        timeStart: formatTime(b.startTime),
                        timeEnd: formatTime(b.endTime),
                        note: p.note,
                        isOccupied: true,
                        booking: {
                            bookingId: b.bookingId,
                            status: b.status,
                            reason: b.bookingReason,
                            user: `${b.user.firstname} ${b.user.lastname}`,
                            username: b.user.username
                        }
                    })
                }

                // Ajouter les créneaux libres
                for (const f of freeIntervals) {
                    slots.push({
                        periodId: p.periodId,
                        timeStart: minutesToTimeString(f.start),
                        timeEnd: minutesToTimeString(f.end),
                        note: p.note,
                        isOccupied: false,
                        booking: null
                    })
                }
            }

            return {
                date: formattedDate,
                dayName: day.toLocaleDateString('fr-FR', { weekday: 'long' }),
                dayFormatted: day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                isSunday: jsDay === 0,
                slots
            }
        })

        return NextResponse.json({
            roomName: room.name,
            bookable: room.bookable,
            grid: availabilityGrid
        })
    } catch (error) {
        console.error('[GET /api/rooms/[id]/availability]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération des disponibilités.' },
            { status: 500 }
        )
    }
}
