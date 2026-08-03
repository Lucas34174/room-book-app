'use client'

import { useEffect, useState, useMemo, FormEvent, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '../../components/Topbar'
import { scheduleToast } from '../../components/ToastProvider'

type Room = {
    roomId: number
    name: string
    location: string
    capacity: number
}

type Period = {
    periodId: number
    timeStart: string
    timeEnd: string
    note: string | null
}

function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
}

function minutesToTime(m: number): string {
    const h = Math.floor(m / 60)
    const mins = m % 60
    return `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function AddBookingForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const roomId = searchParams.get('roomId')
    const periodId = searchParams.get('periodId')
    const date = searchParams.get('date')

    const [room, setRoom] = useState<Room | null>(null)
    const [period, setPeriod] = useState<Period | null>(null)
    const [bookingReason, setBookingReason] = useState('')
    const [bookNumber, setBookNumber] = useState(0)

    const [resStart, setResStart] = useState('')
    const [resEnd, setResEnd] = useState('')
    const [alreadyReserved, setAlreadyReserved] = useState<{ start: string; end: string; user: string }[]>([])

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validationError, setValidationError] = useState<string | null>(null)

    useEffect(() => {
        if (!roomId || !periodId || !date) {
            setError('Paramètres de réservation manquants dans l\'URL.')
            setLoading(false)
            return
        }

        const fetchDetails = async () => {
            try {
                // Fetch room
                const roomRes = await fetch(`/api/rooms/${roomId}`)
                if (!roomRes.ok) throw new Error('Impossible de charger les détails de la salle.')
                const roomData = await roomRes.json()
                setRoom(roomData.room)

                // Fetch periods to get slot times
                const periodsRes = await fetch(`/api/rooms/${roomId}/periods`)
                if (!periodsRes.ok) throw new Error('Impossible de charger les créneaux de la salle.')
                const periodsData = await periodsRes.json()
                
                const matchedPeriod = (periodsData.periods || []).find(
                    (p: any) => p.periodId === parseInt(periodId)
                )
                if (!matchedPeriod) throw new Error('Créneau introuvable pour cette salle.')

                // Vérifier si la date et l'heure de début du créneau sont déjà passées
                const [startH, startM] = matchedPeriod.timeStart.split(':').map(Number)
                const bookingDateTime = new Date(`${date}T${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}:00`)

                if (bookingDateTime < new Date()) {
                    throw new Error('Ce créneau est déjà passé. Il est impossible de le réserver.')
                }

                setPeriod(matchedPeriod)

                // Fetch availability to see already reserved times for this period
                try {
                    const availabilityRes = await fetch(`/api/rooms/${roomId}/availability?startDate=${date}`)
                    if (availabilityRes.ok) {
                        const availData = await availabilityRes.json()
                        const dayData = (availData.grid || []).find((d: any) => d.date === date)
                        if (dayData) {
                            const reservedSlots = (dayData.slots || []).filter(
                                (s: any) => s.periodId === parseInt(periodId) && s.isOccupied
                            )
                            const formattedReserved = reservedSlots.map((s: any) => ({
                                start: s.timeStart,
                                end: s.timeEnd,
                                user: s.booking?.user || 'Occupé'
                            }))
                            setAlreadyReserved(formattedReserved)

                            // Find the first start option that is not inside any reserved slot
                            const startMin = timeToMinutes(matchedPeriod.timeStart)
                            const endMin = timeToMinutes(matchedPeriod.timeEnd)
                            let defaultStart = matchedPeriod.timeStart
                            for (let m = startMin; m < endMin; m += 30) {
                                const timeStr = minutesToTime(m)
                                const isInsideReserved = formattedReserved.some((r: any) => {
                                    const rStart = timeToMinutes(r.start)
                                    const rEnd = timeToMinutes(r.end)
                                    return m >= rStart && m < rEnd
                                })
                                if (!isInsideReserved) {
                                    defaultStart = timeStr
                                    break
                                }
                            }
                            setResStart(defaultStart)

                            // Find the first valid end option for that start
                            const startSelectedMin = timeToMinutes(defaultStart)
                            let maxAllowedMin = endMin
                            for (const r of formattedReserved) {
                                const rStartMin = timeToMinutes(r.start)
                                if (rStartMin > startSelectedMin && rStartMin < maxAllowedMin) {
                                    maxAllowedMin = rStartMin
                                }
                            }
                            setResEnd(minutesToTime(startSelectedMin + 30 <= maxAllowedMin ? startSelectedMin + 30 : maxAllowedMin))
                        } else {
                            setResStart(matchedPeriod.timeStart)
                            setResEnd(matchedPeriod.timeEnd)
                        }
                    } else {
                        setResStart(matchedPeriod.timeStart)
                        setResEnd(matchedPeriod.timeEnd)
                    }
                } catch {
                    setResStart(matchedPeriod.timeStart)
                    setResEnd(matchedPeriod.timeEnd)
                }

            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.')
            } finally {
                setLoading(false)
            }
        }

        fetchDetails()
    }, [roomId, periodId, date])

    const startOptions = useMemo(() => {
        if (!period) return []
        const startMin = timeToMinutes(period.timeStart)
        const endMin = timeToMinutes(period.timeEnd)
        const options = []
        for (let m = startMin; m < endMin; m += 30) {
            const timeStr = minutesToTime(m)
            const isInsideReserved = alreadyReserved.some(r => {
                const rStart = timeToMinutes(r.start)
                const rEnd = timeToMinutes(r.end)
                return m >= rStart && m < rEnd
            })
            if (!isInsideReserved) {
                options.push(timeStr)
            }
        }
        return options
    }, [period, alreadyReserved])

    const endOptions = useMemo(() => {
        if (!period || !resStart) return []
        const startSelectedMin = timeToMinutes(resStart)
        const endMin = timeToMinutes(period.timeEnd)

        // Find the next reserved slot starting after the selected start time
        let maxAllowedMin = endMin
        for (const r of alreadyReserved) {
            const rStartMin = timeToMinutes(r.start)
            if (rStartMin > startSelectedMin && rStartMin < maxAllowedMin) {
                maxAllowedMin = rStartMin
            }
        }

        const options = []
        for (let m = startSelectedMin + 30; m <= maxAllowedMin; m += 30) {
            options.push(minutesToTime(m))
        }
        return options
    }, [period, resStart, alreadyReserved])

    const handleStartChange = (val: string) => {
        setResStart(val)
        const currentStartMin = timeToMinutes(val)
        
        let maxAllowedMin = period ? timeToMinutes(period.timeEnd) : 0
        for (const r of alreadyReserved) {
            const rStartMin = timeToMinutes(r.start)
            if (rStartMin > currentStartMin && rStartMin < maxAllowedMin) {
                maxAllowedMin = rStartMin
            }
        }

        const nextEndMin = currentStartMin + 30
        setResEnd(minutesToTime(nextEndMin <= maxAllowedMin ? nextEndMin : maxAllowedMin))
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setValidationError(null)
        setError(null)

        if (!bookingReason.trim()) {
            setValidationError('Le motif de la réservation est obligatoire.')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodId: parseInt(periodId!),
                    bookingDate: date,
                    bookingReason: bookingReason.trim(),
                    startTime: resStart,
                    endTime: resEnd
                })
            })

            let data: Record<string, any> = {}
            try { data = await res.json() } catch { /* ignore */ }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la réservation.')
            }

            scheduleToast({
                message: data.message || 'Votre réservation a été enregistrée avec succès.',
                type: 'success'
            })

            router.push(`/reservations/confirmation?bookingId=${data.booking.bookingId}`)
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-[640px] w-full mx-auto px-8 py-9 text-center text-brun-600 font-sans text-sm">
                Chargement des détails de la réservation...
            </div>
        )
    }

    if (error && !room) {
        return (
            <div className="max-w-[640px] w-full mx-auto px-8 py-9 text-center">
                <p className="text-red-700 font-sans text-sm mb-4">{error}</p>
                <Link href="/calendrier" className="underline text-brun-700 text-xs uppercase tracking-wider font-sans">
                    Retour au planning
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-[640px] w-full mx-auto px-8 py-9">
            <div className="border-b border-[#d3bd9d] pb-3.5 mb-7">
                <h1 className="text-xl font-normal tracking-wide text-brun-900">
                    Confirmer la réservation
                </h1>
            </div>

            <div className="bg-white border border-[#d3bd9d] p-6.5">
                {/* Récapitulatif du créneau */}
                <div className="bg-brun-050 border border-brun-200 p-5 mb-6 font-sans text-sm text-brun-850 flex flex-col gap-2.5 rounded-sm">
                    <div className="flex justify-between border-b border-brun-100 pb-1.5">
                        <span className="font-semibold text-brun-900">Salle :</span>
                        <span>{room?.name} ({room?.location})</span>
                    </div>
                    <div className="flex justify-between border-b border-brun-100 pb-1.5">
                        <span className="font-semibold text-brun-900">Date :</span>
                        <span>{date ? new Date(date + 'T00:00:00.000Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}</span>
                    </div>
                    <div className="flex justify-between border-b border-brun-100 pb-1.5">
                        <span className="font-semibold text-brun-900">Plage du créneau :</span>
                        <span>{period ? `${period.timeStart.replace(':', 'h')} – ${period.timeEnd.replace(':', 'h')}` : ''}</span>
                    </div>
                    {period?.note && (
                        <div className="flex justify-between italic text-brun-600">
                            <span>Note de créneau :</span>
                            <span>{period.note}</span>
                        </div>
                    )}
                    {alreadyReserved.length > 0 && (
                        <div className="border-t border-brun-200 pt-2.5 mt-2.5">
                            <span className="font-semibold text-brun-900 block mb-1 text-[12.5px]">Plages déjà réservées :</span>
                            <ul className="list-disc pl-5 space-y-0.5 text-xs text-brun-700 font-sans">
                                {alreadyReserved.map((r, idx) => (
                                    <li key={idx}>
                                        De <strong className="text-brun-900">{r.start.replace(':', 'h')}</strong> à <strong className="text-brun-900">{r.end.replace(':', 'h')}</strong> ({r.user})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                    {error && (
                        <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800 font-sans">
                            {error}
                        </div>
                    )}

                    {/* Sélection des horaires de réservation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label htmlFor="resStart" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans font-semibold">
                                Heure de début *
                            </label>
                            <select
                                id="resStart"
                                value={resStart}
                                onChange={(e) => handleStartChange(e.target.value)}
                                className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans rounded-none"
                            >
                                {startOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt.replace(':', 'h')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="resEnd" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans font-semibold">
                                Heure de fin *
                            </label>
                            <select
                                id="resEnd"
                                value={resEnd}
                                onChange={(e) => setResEnd(e.target.value)}
                                className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans rounded-none"
                            >
                                {endOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt.replace(':', 'h')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="bookingReason" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans font-semibold">
                            Motif de la réservation *
                        </label>
                        <textarea
                            id="bookingReason"
                            rows={4}
                            value={bookingReason}
                            onChange={(e) => setBookingReason(e.target.value)}
                            placeholder="Ex : Cours magistral d'Algèbre pour le groupe de licence informatique."
                            className={`w-full px-2.5 py-2 border bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans ${
                                validationError ? 'border-red-700' : 'border-brun-400'
                            }`}
                            aria-invalid={!!validationError}
                            aria-describedby={validationError ? 'reason-error' : undefined}
                        />
                        {validationError && (
                            <span id="reason-error" className="text-xs text-red-700 mt-1.5 font-sans">
                                {validationError}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3 justify-end mt-4">
                        <Link
                            href="/calendrier"
                            className="px-6 py-2 bg-transparent text-brun-850 hover:bg-brun-100 text-xs uppercase tracking-wider border border-brun-400 flex items-center justify-center font-sans"
                        >
                            Annuler
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider border border-brun-800 hover:bg-brun-900 cursor-pointer disabled:opacity-50 font-sans"
                        >
                            {submitting ? 'Confirmation...' : 'Confirmer la réservation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function AddBookingPage() {
    return (
        <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
            <Topbar />
            <Suspense fallback={
                <div className="max-w-[640px] w-full mx-auto px-8 py-9 text-center text-brun-600 font-sans text-sm">
                    Chargement...
                </div>
            }>
                <AddBookingForm />
            </Suspense>
        </div>
    )
}
