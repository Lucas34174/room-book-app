import { prisma } from '../../../../lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin, requireAuth } from '../../../../lib/auth-helpers'

// Helper to format Date objects returned by Prisma for @db.Time() into "HH:MM"
function formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

// Helper to get time in milliseconds since epoch on dummy date 1970-01-01 in UTC
function getUtcTimeMs(date: Date): number {
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    return new Date(`1970-01-01T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`).getTime()
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Accessible à tout utilisateur connecté (nécessaire pour le formulaire de réservation)
    const guard = await requireAuth()
    if (guard) return guard
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

        const periods = await prisma.period.findMany({
            where: { roomId },
            orderBy: [
                { dayOfWeek: 'asc' },
                { timeStart: 'asc' }
            ]
        })

        const formatted = periods.map((p) => ({
            periodId: p.periodId,
            dayOfWeek: p.dayOfWeek,
            timeStart: formatTime(p.timeStart),
            timeEnd: formatTime(p.timeEnd),
            note: p.note
        }))

        return NextResponse.json({ periods: formatted, roomName: room.name })
    } catch (error) {
        console.error('[GET /api/rooms/[id]/periods]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération.' },
            { status: 500 }
        )
    }
}

export async function POST(
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

        let body: {
            dayOfWeek?: string | number
            timeStart?: string
            timeEnd?: string
            note?: string | null
            merge?: boolean
            forceSeparate?: boolean
            mergedNote?: string | null
        }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
        }

        const { dayOfWeek, timeStart, timeEnd, note, merge, forceSeparate, mergedNote } = body

        if (dayOfWeek === undefined || !timeStart || !timeEnd) {
            return NextResponse.json(
                { error: 'Le jour, l’heure de début et l’heure de fin sont requis.' },
                { status: 400 }
            )
        }

        const parsedDay = parseInt(String(dayOfWeek))
        if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 6) {
            return NextResponse.json(
                { error: 'Le jour de la semaine doit être compris entre 1 (Lundi) et 6 (Samedi).' },
                { status: 400 }
            )
        }

        // Validate time format HH:MM
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(timeStart) || !timeRegex.test(timeEnd)) {
            return NextResponse.json(
                { error: 'Le format des heures doit être HH:MM.' },
                { status: 400 }
            )
        }

        const newStartMs = new Date(`1970-01-01T${timeStart}:00.000Z`).getTime()
        const newEndMs = new Date(`1970-01-01T${timeEnd}:00.000Z`).getTime()

        if (newEndMs <= newStartMs) {
            return NextResponse.json(
                { error: 'L’heure de fin doit être strictement après l’heure de début.' },
                { status: 400 }
            )
        }

        const minDurationMs = 30 * 60 * 1000 // 30 minutes
        if (newEndMs - newStartMs < minDurationMs) {
            return NextResponse.json(
                { error: 'La durée d’un créneau doit être d’au moins 30 minutes.' },
                { status: 400 }
            )
        }

        // Overlap validation
        const existingPeriods = await prisma.period.findMany({
            where: {
                roomId,
                dayOfWeek: parsedDay
            }
        })

        for (const existing of existingPeriods) {
            const existingStartMs = getUtcTimeMs(existing.timeStart)
            const existingEndMs = getUtcTimeMs(existing.timeEnd)

            // Overlap check formula: (startA < endB) && (endA > startB)
            if (newStartMs < existingEndMs && newEndMs > existingStartMs) {
                return NextResponse.json(
                    { error: `Ce créneau chevauche un créneau existant (${formatTime(existing.timeStart)} – ${formatTime(existing.timeEnd)}) pour cette salle.` },
                    { status: 409 }
                )
            }
        }

        // Détection de créneaux adjacents / consécutifs
        const beforePeriod = existingPeriods.find(p => getUtcTimeMs(p.timeEnd) === newStartMs)
        const afterPeriod = existingPeriods.find(p => getUtcTimeMs(p.timeStart) === newEndMs)
        const isAdjacent = !!beforePeriod || !!afterPeriod

        if (isAdjacent && !merge && !forceSeparate) {
            const proposedStart = beforePeriod ? formatTime(beforePeriod.timeStart) : timeStart
            const proposedEnd = afterPeriod ? formatTime(afterPeriod.timeEnd) : timeEnd
            return NextResponse.json({
                suggestMerge: true,
                proposedStart,
                proposedEnd,
                beforePeriod: beforePeriod ? {
                    periodId: beforePeriod.periodId,
                    timeStart: formatTime(beforePeriod.timeStart),
                    timeEnd: formatTime(beforePeriod.timeEnd),
                    note: beforePeriod.note
                } : null,
                afterPeriod: afterPeriod ? {
                    periodId: afterPeriod.periodId,
                    timeStart: formatTime(afterPeriod.timeStart),
                    timeEnd: formatTime(afterPeriod.timeEnd),
                    note: afterPeriod.note
                } : null
            }, { status: 202 })
        }

        if (merge && isAdjacent) {
            const mergedPeriod = await prisma.$transaction(async (tx) => {
                const noteValue = mergedNote !== undefined ? (mergedNote?.trim() || null) : (note?.trim() || null)

                if (beforePeriod && afterPeriod) {
                    const updated = await tx.period.update({
                        where: { periodId: beforePeriod.periodId },
                        data: {
                            timeEnd: afterPeriod.timeEnd,
                            note: noteValue
                        }
                    })
                    await tx.booking.updateMany({
                        where: { periodId: afterPeriod.periodId },
                        data: { periodId: beforePeriod.periodId }
                    })
                    await tx.period.delete({
                        where: { periodId: afterPeriod.periodId }
                    })
                    return updated
                } else if (beforePeriod) {
                    const updated = await tx.period.update({
                        where: { periodId: beforePeriod.periodId },
                        data: {
                            timeEnd: new Date(`1970-01-01T${timeEnd}:00.000Z`),
                            note: noteValue
                        }
                    })
                    return updated
                } else {
                    const updated = await tx.period.update({
                        where: { periodId: afterPeriod!.periodId },
                        data: {
                            timeStart: new Date(`1970-01-01T${timeStart}:00.000Z`),
                            note: noteValue
                        }
                    })
                    return updated
                }
            })

            return NextResponse.json({
                success: true,
                merged: true,
                period: {
                    periodId: mergedPeriod.periodId,
                    dayOfWeek: mergedPeriod.dayOfWeek,
                    timeStart: formatTime(mergedPeriod.timeStart),
                    timeEnd: formatTime(mergedPeriod.timeEnd),
                    note: mergedPeriod.note
                }
            }, { status: 200 })
        }

        const createdPeriod = await prisma.period.create({
            data: {
                roomId,
                dayOfWeek: parsedDay,
                timeStart: new Date(`1970-01-01T${timeStart}:00.000Z`),
                timeEnd: new Date(`1970-01-01T${timeEnd}:00.000Z`),
                note: note?.trim() || null
            }
        })

        return NextResponse.json({
            success: true,
            period: {
                periodId: createdPeriod.periodId,
                dayOfWeek: createdPeriod.dayOfWeek,
                timeStart: formatTime(createdPeriod.timeStart),
                timeEnd: formatTime(createdPeriod.timeEnd),
                note: createdPeriod.note
            }
        }, { status: 201 })
    } catch (error) {
        console.error('[POST /api/rooms/[id]/periods]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la création du créneau.' },
            { status: 500 }
        )
    }
}
