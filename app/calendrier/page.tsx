'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import Topbar from '../components/Topbar'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

// ----------------------------------------------------------------
// 1. TYPES & CONFIG
// ----------------------------------------------------------------

type Room = {
    roomId: number
    name: string
    capacity: number
    location: string
}

type Slot = {
    periodId: number
    timeStart: string
    timeEnd: string
    note: string | null
    isOccupied: boolean
    booking: {
        bookingId: number
        status: string
        reason: string
        user: string
        username: string
    } | null
}

type DayGrid = {
    date: string
    dayName: string
    dayFormatted: string
    isSunday: boolean
    slots: Slot[]
}

type Booking = {
    bookingId: number
    bookingDate: string
    status: 'en_attente' | 'confirmee' | 'refusee' | 'annulee'
    bookingReason: string
    cancelReason: string
    refusalReason: string
    roomName: string
    roomId: number
    location: string
    timeStart: string
    timeEnd: string
}

type Role = {
    name: string
    description: string
    maxActiveBookings: number
}

type UserProfile = {
    userId: number
    username: string
    email: string
    phone: string | null
    firstname: string
    lastname: string
    role: Role
}

// type StatutCreneau = 'libre' | 'occupe' | 'en attente'

interface Creneau {
    id: string
    salleId: string
    jour: number // 0 = Lundi ... 6 = Dimanche
    heureDebut: number // en heures décimales, ex: 14.5 = 14h30
    heureFin: number
    statut: string
    libelle?: string
    bookingReason?: string
    periodId: number
    dateStr: string
    username?: string
}

interface CreneauPositionne extends Creneau {
    colonne: number
    nbColonnes: number
}



const HEURE_MIN = 7 // début de la plage affichée
const HEURE_MAX = 18 // fin de la plage affichée
const PAS = 0.5 // granularité : 30 minutes
const NB_LIGNES = Math.round((HEURE_MAX - HEURE_MIN) / PAS)

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// ----------------------------------------------------------------
// 2. HELPERS
// ----------------------------------------------------------------

function timeStringToHours(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number)
    return h + m / 60
}

function heureToRow(heure: number): number {
    return Math.round((heure - HEURE_MIN) / PAS) + 1
}

function formatHeure(h: number): string {
    const heures = Math.floor(h)
    const minutes = Math.round((h - heures) * 60)
    return `${String(heures).padStart(2, '0')}h${minutes === 0 ? '00' : minutes}`
}

/** Retourne la date du jour au format YYYY-MM-DD, basée sur l'heure LOCALE de l'utilisateur. */
function todayLocalISODate(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/** Décale une date (YYYY-MM-DD) de `days` jours, en restant en UTC pour ne jamais glisser d'un jour. */
function shiftDate(dateStr: string, days: number): string {
    const [year, month, day] = dateStr.split('-').map(Number)
    const utcDate = new Date(Date.UTC(year, month - 1, day))
    utcDate.setUTCDate(utcDate.getUTCDate() + days)
    return utcDate.toISOString().split('T')[0]
}

/** Recale n'importe quelle date sur le LUNDI de sa semaine. */
function normalizeToMonday(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number)
    const utcDate = new Date(Date.UTC(year, month - 1, day))
    const dayOfWeek = utcDate.getUTCDay() // 0 = dimanche, 1 = lundi, ..., 6 = samedi
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    utcDate.setUTCDate(utcDate.getUTCDate() + diffToMonday)
    return utcDate.toISOString().split('T')[0]
}

function formatJourMois(d: Date): string {
    return `${d.getUTCDate()} ${d.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })}`
}

// ----------------------------------------------------------------
// 3. POSITIONNEMENT ALGORITHMIQUE (Évite les chevauchements)
// ----------------------------------------------------------------

function positionnerCreneaux(creneaux: Creneau[]): CreneauPositionne[] {
    const tries = [...creneaux].sort((a, b) => a.heureDebut - b.heureDebut)
    const resultat: CreneauPositionne[] = []
    const colonnesActives: { fin: number; colonne: number }[] = []

    for (const c of tries) {
        // Libère les colonnes dont le créneau précédent est terminé
        for (let i = colonnesActives.length - 1; i >= 0; i--) {
            if (colonnesActives[i].fin <= c.heureDebut) colonnesActives.splice(i, 1)
        }
        const colonnesPrises = new Set(colonnesActives.map((x) => x.colonne))
        let colonne = 0
        while (colonnesPrises.has(colonne)) colonne++
        colonnesActives.push({ fin: c.heureFin, colonne })

        resultat.push({ ...c, colonne, nbColonnes: 1 })
    }

    const maxColonnes = Math.max(1, ...colonnesActives.map((c) => c.colonne + 1), ...resultat.map((c) => c.colonne + 1))
    return resultat.map((c) => ({ ...c, nbColonnes: maxColonnes }))
}

// ----------------------------------------------------------------
// 3.5 TOOLTIP AVEC DÉLAI DE 2 SECONDES
// ----------------------------------------------------------------

function HoverTooltip({ text, maxLength = 20, className = '' }: { text: string; maxLength?: number; className?: string }) {
    const [showTooltip, setShowTooltip] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            setShowTooltip(true)
        }, 2000)
    }

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        setShowTooltip(false)
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    const truncated = text.length > maxLength ? text.slice(0, maxLength) + '...' : text

    return (
        <span
            className={`relative group inline-block max-w-full cursor-help ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <span>{truncated}</span>
            {showTooltip && text.length > maxLength && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 bg-[#241812] text-[#faf5ec] text-[9.5px] p-2 border border-[#d3bd9d] shadow-lg whitespace-normal break-words w-[180px] pointer-events-none rounded-none font-sans font-normal leading-normal normal-case">
                    {text}
                </span>
            )}
        </span>
    )
}

// ----------------------------------------------------------------
// 4. COMPOSANT
// ----------------------------------------------------------------

export default function CalendrierPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [selectedRoomId, setSelectedRoomId] = useState<string>('')
    const [startDate, setStartDate] = useState<string>(() => normalizeToMonday(todayLocalISODate()))
    const [grid, setGrid] = useState<DayGrid[] | null>(null)
    const [roomName, setRoomName] = useState<string>('')
    const [userRole, setUserRole] = useState<string | null>(null)
    const [me, setMe] = useState<string>('')
    const [loadingRooms, setLoadingRooms] = useState(true)
    const [loadingGrid, setLoadingGrid] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    // const [bookings, setBookings] = useState<Booking[]>([])
    const [bookingNum, setBookingNum] = useState<number>(0)
    // Load rooms list + current user role
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const [roomsRes, meRes] = await Promise.all([
                    fetch('/api/rooms/search'),
                    fetch('/api/auth/me'),
                ])
                if (!roomsRes.ok) throw new Error('Erreur lors du chargement des salles.')
                const data = await roomsRes.json()
                setRooms(data.rooms || [])
                if (meRes.ok) {
                    const meData = await meRes.json()
                    setUserRole(meData.roleName ?? null)
                    setMe(meData.username)
                }

                // Priorité au paramètre URL roomId si présent, sinon première salle
                const params = new URLSearchParams(window.location.search)
                const queryRoomId = params.get('roomId')
                if (queryRoomId) {
                    setSelectedRoomId(queryRoomId)
                } else if (data.rooms && data.rooms.length > 0) {
                    setSelectedRoomId(String(data.rooms[0].roomId))
                }

                const queryDate = params.get('date')
                if (queryDate) {
                    setStartDate(normalizeToMonday(queryDate))
                }
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.')
            } finally {
                setLoadingRooms(false)
            }
        }
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/profile')
                if (!res.ok) {
                    throw new Error('Erreur lors du chargement du profil.')
                }
                const data = await res.json()
                setProfile(data.user)
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.')
            }
        }
        const fetchBookings = async () => {
            try {
                const res = await fetch('/api/bookings')
                if (!res.ok) throw new Error('Impossible de charger vos réservations.')
                const data = await res.json()
                console.log("data: " + JSON.stringify(data.bookings))

                // compté le nombre de booking confirmé et en attente qui ne sont pas encore dépassé    
                const count = data.bookings.filter((booking: Booking) => {
                    const bookingEnd = new Date(`${booking.bookingDate}T${booking.timeEnd}`);
                    const now = new Date();
                    if ((booking.status === 'confirmee' || booking.status === 'en_attente') && bookingEnd > now) {
                        console.log("status: " + booking.status)
                        console.log("bookingEnd: " + bookingEnd)
                        console.log("now: " + now)
                    }
                    return (booking.status === 'confirmee' || booking.status === 'en_attente') && bookingEnd > now
                }).length
                setBookingNum(count)
                console.log("bookingnum: " + count)
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.')
            }
        }

        fetchProfile()
        fetchRooms()
        fetchBookings()
    }, [])

    // Seuls teacher et student peuvent réserver
    const canBook = userRole !== null && userRole !== 'admin' && userRole !== 'validator'

    // Load grid when selectedRoomId or startDate changes
    useEffect(() => {
        if (!selectedRoomId) return

        const fetchGrid = async () => {
            setLoadingGrid(true)
            setError(null)
            try {
                const res = await fetch(`/api/rooms/${selectedRoomId}/availability?startDate=${startDate}`)
                if (!res.ok) throw new Error('Erreur lors du chargement du calendrier.')
                const data = await res.json()
                setGrid(data.grid || [])
                setRoomName(data.roomName || '')
            } catch (err: any) {
                setError(err.message || 'Impossible de charger le calendrier.')
            } finally {
                setLoadingGrid(false)
            }
        }

        fetchGrid()
    }, [selectedRoomId, startDate])

    // Génère les 7 dates de la semaine en cours
    const semaine = useMemo(() => {
        const [year, month, day] = startDate.split('-').map(Number)
        const monday = new Date(Date.UTC(year, month - 1, day))
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday)
            d.setUTCDate(monday.getUTCDate() + i)
            return d
        })
    }, [startDate])

    // Convertit notre grille API en créneaux positionnés pour le calendrier visuel
    const creneauxParJour = useMemo(() => {
        const parJour: Record<number, CreneauPositionne[]> = {}
        if (!grid) return parJour

        for (let j = 0; j < 7; j++) {
            const dayData = grid[j]
            if (!dayData) continue
            const slotsForDay: Creneau[] = dayData.slots.map((slot) => {
                const startHours = timeStringToHours(slot.timeStart)
                const endHours = timeStringToHours(slot.timeEnd)
                // console.log("status:"+ slot.booking?.status)
                return {
                    id: String(slot.periodId) + '-' + slot.timeStart,
                    salleId: selectedRoomId,
                    jour: j,
                    heureDebut: startHours,
                    heureFin: endHours,
                    statut: slot.booking ? `${slot.booking.status}` : 'libre',
                    libelle: slot.booking ? `${slot.booking.user}` : undefined,
                    bookingReason: slot.booking?.reason,
                    periodId: slot.periodId,
                    dateStr: dayData.date,
                    username: slot.booking?.username,
                }
            })

            parJour[j] = positionnerCreneaux(slotsForDay)
        }
        return parJour
    }, [grid, selectedRoomId])

    function handlePreviousWeek() {
        setStartDate((prev) => shiftDate(prev, -7))
    }

    function handleNextWeek() {
        setStartDate((prev) => shiftDate(prev, 7))
    }

    function handleToday() {
        setStartDate(normalizeToMonday(todayLocalISODate()))
    }

    const ligneHeures = Array.from({ length: NB_LIGNES + 1 }, (_, i) => HEURE_MIN + i * PAS)

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
            <Topbar />

            <div className="max-w-[1550px] w-full mx-auto px-6 md:px-8 py-9 flex-1">
                <div className="border-b border-[#d3bd9d] pb-3.5 mb-7">
                    <h1 className="text-2xl font-light text-brun-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                        Calendrier d&apos;occupation des salles
                    </h1>
                    <p className="text-gray-600 mt-2">Demande de reservations restant: {profile ? profile.role.maxActiveBookings - bookingNum : "non defini"}</p>
                </div>

                {/* --- Contrôles de navigation et sélection --- */}
                <div className="bg-white border border-[#d3bd9d] p-5 mb-7 flex flex-wrap gap-6 items-end rounded-none shadow-none">
                    <div className="flex flex-col min-w-[280px]">
                        <label htmlFor="room-select" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans font-semibold">
                            Choisir une salle
                        </label>
                        {loadingRooms ? (
                            <div className="text-sm font-sans text-brun-500">Chargement des salles...</div>
                        ) : (
                            <select
                                id="room-select"
                                value={selectedRoomId}
                                onChange={(e) => setSelectedRoomId(e.target.value)}
                                className="px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans rounded-none"
                            >
                                {rooms.map((r) => (
                                    <option key={r.roomId} value={r.roomId}>
                                        {r.name} ({r.location})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="start-date" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans font-semibold">
                            Date de début (recalée au lundi)
                        </label>
                        <div className="flex items-center gap-2 border border-brun-400 bg-brun-050 px-3 py-1.5 rounded-none focus-within:border-brun-700 focus-within:bg-white">
                            <input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(normalizeToMonday(e.target.value))}
                                className="outline-none bg-transparent text-sm text-encre font-sans w-full"
                            />
                            <CalendarDays size={16} className="text-brun-500" />
                        </div>
                    </div>

                    <div className="flex gap-2 font-sans">
                        <button
                            onClick={handlePreviousWeek}
                            className="px-4 py-2 border border-brun-400 text-brun-850 hover:bg-brun-100 text-xs uppercase tracking-wider cursor-pointer rounded-none bg-white transition-colors"
                        >
                            <ChevronLeft size={14} className="inline mr-1" /> Précédent
                        </button>
                        <button
                            onClick={handleToday}
                            className="px-4 py-2 border border-brun-400 text-brun-850 hover:bg-brun-100 text-xs uppercase tracking-wider cursor-pointer rounded-none bg-white transition-colors"
                        >
                            Aujourd&apos;hui
                        </button>
                        <button
                            onClick={handleNextWeek}
                            className="px-4 py-2 border border-brun-400 text-brun-850 hover:bg-brun-100 text-xs uppercase tracking-wider cursor-pointer rounded-none bg-white transition-colors"
                        >
                            Suivant <ChevronRight size={14} className="inline ml-1" />
                        </button>
                    </div>
                </div>

                {error && (
                    <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800 mb-6 font-sans rounded-none">
                        {error}
                    </div>
                )}

                {/* --- Grille du Calendrier Visuel --- */}
                <div className="bg-white border border-[#d3bd9d] overflow-x-auto rounded-none shadow-none">
                    {loadingGrid ? (
                        <div className="p-16 text-center text-brun-600 font-sans text-sm">
                            Chargement du planning...
                        </div>
                    ) : grid === null ? (
                        <div className="p-16 text-center text-brun-600 font-sans text-sm">
                            Sélectionnez une salle pour afficher son planning.
                        </div>
                    ) : (
                        <div className="grid min-w-[1000px] border-collapse" style={{ gridTemplateColumns: '110px repeat(7, 1fr)' }}>
                            {/* En-tête des colonnes */}
                            <div className="border-b border-r border-[#d3bd9d] p-3.5 text-[11px] font-bold text-brun-700 tracking-wider bg-brun-050 uppercase font-sans">
                                Horaires
                            </div>
                            {semaine.map((d, i) => (
                                <div
                                    key={i}
                                    className={`border-b border-r border-[#d3bd9d] p-3 text-center font-sans ${i === 6 ? 'bg-brun-100/35 text-brun-400' : 'bg-brun-050 text-brun-900'
                                        }`}
                                >
                                    <div className="font-semibold text-xs uppercase tracking-wider">{JOURS[i]}</div>
                                    <div className="text-[11px] text-brun-600 mt-0.5">{formatJourMois(d)}</div>
                                </div>
                            ))}

                            {/* Colonne des heures (repères) */}
                            <div
                                className="relative border-r border-[#d3bd9d] bg-brun-050/30"
                                style={{ display: 'grid', gridTemplateRows: `repeat(${NB_LIGNES}, minmax(26px, 1fr))` }}
                            >
                                {ligneHeures.slice(0, -1).map((h, i) => (
                                    <div
                                        key={i}
                                        className="text-[9px] font-sans font-medium text-brun-500 border-t border-brun-100/40 flex items-start justify-end pr-2 pt-0.5"
                                    >
                                        {h % 1 === 0 ? formatHeure(h) : ''}
                                    </div>
                                ))}
                            </div>

                            {/* Colonnes des jours */}
                            {semaine.map((_, jourIndex) => {
                                const estDimanche = jourIndex === 6
                                return (
                                    <div
                                        key={jourIndex}
                                        className={`relative border-r border-[#d3bd9d] ${estDimanche ? 'bg-brun-100/10' : ''
                                            }`}
                                        style={{
                                            display: 'grid',
                                            gridTemplateRows: `repeat(${NB_LIGNES}, minmax(26px, 1fr))`,
                                            gridTemplateColumns: '1fr',
                                        }}
                                    >
                                        {/* Lignes de fond (repères horizontaux) */}
                                        {Array.from({ length: NB_LIGNES }).map((_, i) => (
                                            <div key={i} className="border-t border-brun-100/40" style={{ gridColumn: 1, gridRow: i + 1 }} />
                                        ))}

                                        {estDimanche ? (
                                            <div
                                                className="flex items-center justify-center text-brun-400 italic text-[11px] font-sans"
                                                style={{ gridRow: `1 / ${NB_LIGNES + 1}`, gridColumn: 1 }}
                                            >
                                                Fermé
                                            </div>
                                        ) : (
                                            creneauxParJour[jourIndex]?.map((c) => {
                                                const rowStart = heureToRow(c.heureDebut)
                                                const rowEnd = heureToRow(c.heureFin)
                                                const largeur = 100 / c.nbColonnes

                                                const estLibre = c.statut === 'libre'
                                                const estEnAttente = c.statut === 'en_attente' || c.statut === 'en attente'
                                                const estConfirme = c.statut === 'confirmee' || c.statut === 'confirmée'

                                                const [year, month, day] = c.dateStr.split('-').map(Number)
                                                const hours = Math.floor(c.heureDebut)
                                                const minutes = Math.round((c.heureDebut - hours) * 60)
                                                const slotStartDateTime = new Date(year, month - 1, day, hours, minutes, 0)
                                                const estPasse = slotStartDateTime < new Date()
                                                 
                                                let boxClass = 'bg-red-50/80 border-red-200 text-red-800'
                                                let label = 'OCCUPÉ'
                                                if (estLibre) {
                                                    boxClass = 'bg-green-50/90 border-green-200 text-green-800 hover:bg-green-100/90'
                                                    label = 'LIBRE'
                                                } else if (estEnAttente) {
                                                    boxClass = 'bg-amber-50/90 border-amber-300 text-amber-800 hover:bg-amber-100/90'
                                                    label = 'EN ATTENTE'
                                                }
                                                if (estPasse) {
                                                    label = label + ' PASSÉ'
                                                }

                                                const tooltip = !estLibre
                                                    ? `${estEnAttente ? 'Demande en attente de' : 'Réservé par'} : ${c.libelle}\nMotif : ${c.bookingReason || 'Aucun'}`
                                                    : undefined

                                                return (
                                                    <div
                                                        key={c.id}
                                                        className={`absolute border text-[11px] p-1 px-1.5 overflow-hidden rounded-none transition-colors select-none flex flex-col justify-between ${boxClass}`}
                                                        style={{
                                                            top: `${((rowStart - 1) / NB_LIGNES) * 100}%`,
                                                            height: `${((rowEnd - rowStart) / NB_LIGNES) * 100}%`,
                                                            left: `${c.colonne * largeur}%`,
                                                            width: `${largeur}%`,
                                                            margin: '1px'
                                                        }}
                                                        title={tooltip}
                                                    >
                                                        <div className="flex flex-col gap-0.5 leading-tight">
                                                            <div className="font-bold text-[10px] uppercase tracking-wider font-sans">
                                                                {label}
                                                            </div>
                                                            <div className="text-[9.5px] font-sans opacity-70">
                                                                {formatHeure(c.heureDebut)} – {formatHeure(c.heureFin)}
                                                            </div>
                                                            {!estLibre && (
                                                                <div className="text-[10px] font-sans font-medium truncate max-w-full">
                                                                    <div>
                                                                        <HoverTooltip text={c.libelle || ''} maxLength={18} />
                                                                    </div>
                                                                    {c.bookingReason && (
                                                                        <div className="text-[10px] font-sans opacity-70 italic mt-0.5">
                                                                            Motif: <HoverTooltip text={c.bookingReason} maxLength={16} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {(estLibre || estEnAttente && c.username !== me) && !estPasse && canBook && profile!.role.maxActiveBookings > bookingNum && (
                                                            <Link
                                                                href={`/reservations/ajouter?roomId=${selectedRoomId}&periodId=${c.periodId}&date=${c.dateStr}`}
                                                                className={`${estEnAttente
                                                                    ? 'text-amber-700 hover:text-amber-950'
                                                                    : 'text-green-700 hover:text-green-950'
                                                                    } font-bold underline text-[10px] font-sans inline-block self-end text-right`}
                                                            >
                                                                Réserver &rarr;
                                                            </Link>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}