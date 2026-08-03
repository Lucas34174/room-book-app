import { prisma } from '../../../lib/prisma'
import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth-helpers'

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json(
            { error: 'Vous devez être connecté.' },
            { status: 401 }
        )
    }

    const { roleName, userId } = session

    try {
        if (roleName === 'admin') {
            const [totalUsers, totalRooms, totalBookings, totalLogs] = await Promise.all([
                prisma.user.count(),
                prisma.room.count(),
                prisma.booking.count(),
                prisma.log.count(),
            ])

            // Top 5 des salles les plus réservées
            const roomBookings = await prisma.booking.groupBy({
                by: ['periodId'],
                _count: {
                    bookingId: true
                }
            })

            // Associer aux salles réelles
            const periods = await prisma.period.findMany({
                include: {
                    room: true
                }
            })

            const roomCounts: Record<string, number> = {}
            roomBookings.forEach(rb => {
                const period = periods.find(p => p.periodId === rb.periodId)
                if (period && period.room) {
                    const roomName = period.room.name
                    roomCounts[roomName] = (roomCounts[roomName] || 0) + rb._count.bookingId
                }
            })

            const chartData = Object.entries(roomCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)

            return NextResponse.json({
                role: 'admin',
                stats: {
                    totalUsers,
                    totalRooms,
                    totalBookings,
                    totalLogs
                },
                chartData
            })
        }

        if (roleName === 'teacher') {
            const [totalBookings, confirmedBookings, pendingBookings, otherBookings] = await Promise.all([
                prisma.booking.count({ where: { userId } }),
                prisma.booking.count({ where: { userId, status: 'confirmee' } }),
                prisma.booking.count({ where: { userId, status: 'en_attente' } }),
                prisma.booking.count({ where: { userId, status: { in: ['refusee', 'annulee'] } } }),
            ])

            // Récupérer les réservations pour répartir par jour de la semaine
            const bookings = await prisma.booking.findMany({
                where: { userId },
                include: {
                    period: true
                }
            })

            const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
            const dayCounts: Record<string, number> = {}
            days.forEach(d => { dayCounts[d] = 0 })

            bookings.forEach(b => {
                // dayOfWeek est de 1 (lundi) à 7 (dimanche)
                const dayIndex = b.period.dayOfWeek - 1
                const dayName = days[dayIndex]
                if (dayName) {
                    dayCounts[dayName]++
                }
            })

            const chartData = days.map(name => ({
                name,
                count: dayCounts[name] || 0
            }))

            return NextResponse.json({
                role: 'teacher',
                stats: {
                    totalBookings,
                    confirmedBookings,
                    pendingBookings,
                    otherBookings
                },
                chartData
            })
        }

        if (roleName === 'student') {
            const [totalBookings, confirmedBookings, pendingBookings, refusedBookings, cancelledBookings] = await Promise.all([
                prisma.booking.count({ where: { userId } }),
                prisma.booking.count({ where: { userId, status: 'confirmee' } }),
                prisma.booking.count({ where: { userId, status: 'en_attente' } }),
                prisma.booking.count({ where: { userId, status: 'refusee' } }),
                prisma.booking.count({ where: { userId, status: 'annulee' } }),
            ])

            const chartData = [
                { name: 'Confirmées', count: confirmedBookings },
                { name: 'En attente', count: pendingBookings },
                { name: 'Refusées', count: refusedBookings },
                { name: 'Annulées', count: cancelledBookings },
            ]

            return NextResponse.json({
                role: 'student',
                stats: {
                    totalBookings,
                    confirmedBookings,
                    pendingBookings,
                    refusedBookings,
                    cancelledBookings
                },
                chartData
            })
        }

        if (roleName === 'validator') {
            const [pendingBookings, processedBookings, totalRooms] = await Promise.all([
                prisma.booking.count({ where: { status: 'en_attente' } }),
                prisma.booking.count({ where: { status: { in: ['confirmee', 'refusee'] } } }),
                prisma.room.count(),
            ])

            // Incoming requests over the last 7 days
            const today = new Date()
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(today.getDate() - 7)
            sevenDaysAgo.setHours(0, 0, 0, 0)

            const recentBookings = await prisma.booking.findMany({
                where: {
                    createdAt: {
                        gte: sevenDaysAgo
                    }
                },
                select: {
                    createdAt: true
                }
            })

            // Group by date
            const dateCounts: Record<string, number> = {}
            for (let i = 6; i >= 0; i--) {
                const d = new Date()
                d.setDate(today.getDate() - i)
                const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
                dateCounts[label] = 0
            }

            recentBookings.forEach(b => {
                const label = new Date(b.createdAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
                if (dateCounts[label] !== undefined) {
                    dateCounts[label]++
                }
            })

            const chartData = Object.entries(dateCounts).map(([name, count]) => ({
                name,
                count
            }))

            return NextResponse.json({
                role: 'validator',
                stats: {
                    pendingBookings,
                    processedBookings,
                    totalRooms
                },
                chartData
            })
        }

        return NextResponse.json({ error: 'Rôle non reconnu.' }, { status: 400 })

    } catch (error) {
        console.error('[GET /api/dashboard/stats]', error)
        return NextResponse.json(
            { error: 'Erreur lors du chargement des statistiques du tableau de bord.' },
            { status: 500 }
        )
    }
}
