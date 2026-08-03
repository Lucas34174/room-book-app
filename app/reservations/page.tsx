'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '../components/Topbar'
import { scheduleToast } from '../components/ToastProvider'
import { Inbox, Calendar, Clock, MapPin, X } from 'lucide-react'

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

const STATUS_CONFIG = {
    confirmee: { label: 'Confirmée', className: 'text-emerald-800 border-emerald-300 bg-emerald-50' },
    en_attente: { label: 'En attente', className: 'text-amber-800 border-amber-300 bg-amber-50' },
    refusee: { label: 'Refusée', className: 'text-red-700 border-red-200 bg-red-50' },
    annulee: { label: 'Annulée', className: 'text-gray-500 border-gray-200 bg-gray-50' },
}

export default function PersonalBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Modal state for cancellation
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [targetBookingId, setTargetBookingId] = useState<number | null>(null)
    const [cancelReason, setCancelReason] = useState('')
    const [modalError, setModalError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Filtres
    const [filterStatus, setFilterStatus] = useState('confirmee')
    const [filterRoom, setFilterRoom] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const [filterPeriod, setFilterPeriod] = useState('') // 'future' | 'past' | ''

    const filteredBookings = bookings.filter((b) => {
        if (filterStatus && b.status !== filterStatus) return false
        if (filterRoom.trim() && !b.roomName.toLowerCase().includes(filterRoom.toLowerCase())) return false
        if (filterDate && b.bookingDate !== filterDate) return false
        if (filterPeriod) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const bookingDay = new Date(b.bookingDate + 'T00:00:00.000Z')
            bookingDay.setHours(0, 0, 0, 0)
            if (filterPeriod === 'future' && bookingDay < today) return false
            if (filterPeriod === 'past' && bookingDay >= today) return false
        }
        return true
    })

    const hasActiveFilters = filterStatus || filterRoom.trim() || filterDate || filterPeriod

    const fetchBookings = async () => {
        try {
            const res = await fetch('/api/bookings')
            if (!res.ok) throw new Error('Impossible de charger vos réservations.')
            const data = await res.json()
            setBookings(data.bookings || [])
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBookings()
    }, [])

    function openCancelModal(bookingId: number) {
        setTargetBookingId(bookingId)
        setCancelReason('')
        setModalError(null)
        setIsModalOpen(true)
    }

    function closeCancelModal() {
        setIsModalOpen(false)
        setTargetBookingId(null)
        setCancelReason('')
        setModalError(null)
    }

    async function handleConfirmCancel() {
        if (!targetBookingId) return
        if (!cancelReason.trim()) {
            setModalError('Le motif d\'annulation est obligatoire.')
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch(`/api/bookings/${targetBookingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel', cancelReason: cancelReason.trim() }),
            })
            let data: Record<string, any> = {}
            try { data = await res.json() } catch { /* ignore */ }
            if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'annulation.')
            scheduleToast({ message: 'Réservation annulée avec succès.', type: 'success' })
            closeCancelModal()
            setLoading(true)
            await fetchBookings()
        } catch (err: any) {
            setModalError(err.message || 'Une erreur est survenue.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col">
            <Topbar />

            {/* Modal d'annulation */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-brun-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeCancelModal}>
                    <div
                        className="bg-white border border-[#d3bd9d] p-7 max-w-md w-full shadow-2xl rounded-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-base font-semibold text-brun-900">
                                    Annuler la réservation
                                </h2>
                                <p className="text-xs text-brun-600 mt-0.5">
                                    Veuillez renseigner un motif pour justifier l&apos;annulation.
                                </p>
                            </div>
                            <button onClick={closeCancelModal} className="text-brun-400 hover:text-brun-700 cursor-pointer p-1 -mr-1 -mt-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {modalError && (
                            <div role="alert" className="border-l-[3px] border-red-500 bg-red-50 px-3 py-2.5 text-xs text-red-800 mb-4">
                                {modalError}
                            </div>
                        )}

                        <div className="flex flex-col mb-5">
                            <label htmlFor="cancelReason" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-semibold">
                                Motif d&apos;annulation *
                            </label>
                            <textarea
                                id="cancelReason"
                                rows={3}
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Ex : Réunion déplacée ou cours annulé."
                                className={`w-full px-3 py-2 border bg-brun-050 text-sm text-encre focus:outline-none font-sans rounded-sm ${modalError ? 'border-red-400' : 'border-brun-300'}`}
                            />
                        </div>

                        <div className="flex gap-2.5 justify-end">
                            <button
                                onClick={closeCancelModal}
                                disabled={submitting}
                                className="px-4 py-2 border border-brun-300 text-brun-700 hover:bg-brun-100 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 rounded-sm font-medium"
                            >
                                Revenir
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                disabled={submitting}
                                className="px-4 py-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 bg-red-600 text-white hover:bg-red-700 rounded-sm font-medium"
                            >
                                {submitting ? 'Annulation...' : 'Confirmer l\'annulation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[820px] w-full mx-auto px-8 py-10 flex-1">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-2xl font-light text-brun-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                                Mes réservations
                            </h1>
                            <p className="text-xs text-brun-500 mt-1">
                                Consultez et gérez vos réservations en cours.
                            </p>
                        </div>
                        <Link
                            href="/calendrier"
                            className="flex items-center gap-1.5 text-xs text-brun-700 border border-brun-300 px-3 py-1.5 hover:bg-brun-100 hover:border-brun-500 transition-colors rounded-sm font-medium"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            Nouvelle réservation
                        </Link>
                    </div>
                    <div className="h-px bg-gradient-to-r from-brun-300 via-brun-200 to-transparent mt-5" />
                </div>

                {loading ? (
                    <div className="bg-white border border-[#d3bd9d] p-10 text-center text-brun-500 text-sm"
                        style={{ boxShadow: 'var(--shadow-card)' }}>
                        <div className="w-5 h-5 border-2 border-brun-200 border-t-brun-600 rounded-full animate-spin mx-auto mb-3" />
                        Chargement de vos réservations...
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 p-8 text-center text-red-700 text-sm rounded-sm">
                        {error}
                    </div>
                ) : (
                    <>
                        {/* Barre de filtres */}
                        {bookings.length > 0 && (
                            <div className="bg-white border border-[#d3bd9d] p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm">
                                <div>
                                    <label htmlFor="filterStatus" className="block text-[10px] uppercase tracking-wide text-brun-700 font-semibold mb-1">Statut</label>
                                    <select
                                        id="filterStatus"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-brun-300 bg-brun-050 text-xs focus:outline-none focus:border-brun-600 rounded-none h-[30px]"
                                    >
                                        <option value="">Tous les statuts</option>
                                        <option value="en_attente">En attente</option>
                                        <option value="confirmee">Confirmée</option>
                                        <option value="refusee">Refusée</option>
                                        <option value="annulee">Annulée</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="filterRoom" className="block text-[10px] uppercase tracking-wide text-brun-700 font-semibold mb-1">Salle</label>
                                    <input
                                        id="filterRoom"
                                        type="text"
                                        value={filterRoom}
                                        onChange={(e) => setFilterRoom(e.target.value)}
                                        placeholder="Nom de la salle..."
                                        className="w-full px-2 py-1.5 border border-brun-300 bg-brun-050 text-xs focus:outline-none focus:border-brun-600 rounded-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="filterDate" className="block text-[10px] uppercase tracking-wide text-brun-700 font-semibold mb-1">Date</label>
                                    <input
                                        id="filterDate"
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="w-full px-2 py-1 border border-brun-300 bg-brun-050 text-xs focus:outline-none focus:border-brun-600 rounded-none h-[30px]"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="filterPeriod" className="block text-[10px] uppercase tracking-wide text-brun-700 font-semibold mb-1">Période</label>
                                    <select
                                        id="filterPeriod"
                                        value={filterPeriod}
                                        onChange={(e) => setFilterPeriod(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-brun-300 bg-brun-050 text-xs focus:outline-none focus:border-brun-600 rounded-none h-[30px]"
                                    >
                                        <option value="">Toutes les périodes</option>
                                        <option value="future">À venir</option>
                                        <option value="past">Passées</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {bookings.length === 0 ? (
                            <div className="bg-white border border-[#d3bd9d] p-12 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <div className="flex justify-center mb-3">
                                    <Inbox className="w-10 h-10 text-brun-300" strokeWidth={1.5} />
                                </div>
                                <p className="text-sm font-medium text-brun-700 mb-1">Aucune réservation</p>
                                <p className="text-xs text-brun-500 mb-5">Vous n&apos;avez aucune réservation enregistrée.</p>
                                <Link
                                    href="/calendrier"
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider hover:bg-brun-900 transition-colors font-medium rounded-sm"
                                >
                                    <Calendar className="w-3.5 h-3.5" />
                                    Réserver une salle
                                </Link>
                            </div>
                        ) : filteredBookings.length === 0 ? (
                            <div className="bg-white border border-[#d3bd9d] p-12 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <p className="text-sm font-medium text-brun-700 mb-1">Aucun résultat</p>
                                <p className="text-xs text-brun-500 mb-4">Aucune réservation ne correspond à vos filtres.</p>
                                {hasActiveFilters && (
                                    <button
                                        onClick={() => { setFilterStatus(''); setFilterRoom(''); setFilterDate(''); setFilterPeriod('') }}
                                        className="px-4 py-1.5 bg-brun-800 text-brun-050 text-xs uppercase tracking-wide cursor-pointer hover:bg-brun-900 transition-colors font-medium"
                                    >
                                        Voir tous les réservations
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {filteredBookings.map((b) => {
                                    const isPending = b.status === 'en_attente'
                                    const isConfirmed = b.status === 'confirmee'
                                    const isCancelled = b.status === 'annulee'
                                    const isRefused = b.status === 'refusee'

                                    const today = new Date()
                                    today.setHours(0, 0, 0, 0)
                                    const bookingDay = new Date(b.bookingDate + 'T00:00:00.000Z')
                                    bookingDay.setHours(0, 0, 0, 0)
                                    const isPast = bookingDay < today

                                    const statusConf = STATUS_CONFIG[b.status] ?? { label: b.status, className: 'text-gray-500 border-gray-300 bg-gray-50' }

                                    return (
                                        <div
                                            key={b.bookingId}
                                            className={`bg-white border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-150 rounded-sm ${isPast || isCancelled || isRefused ? 'border-brun-200 opacity-70' : 'border-[#d3bd9d] hover:border-brun-500 hover:shadow-sm'}`}
                                            style={{ boxShadow: 'var(--shadow-card)' }}
                                        >
                                            <Link
                                                href={`/calendrier?roomId=${b.roomId}&date=${b.bookingDate}`}
                                                className="flex-1 min-w-0 p-5 cursor-pointer block hover:bg-brun-050/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                                                    <h2 className="text-sm font-semibold text-brun-900 group-hover:text-brun-700">
                                                        {b.roomName}
                                                    </h2>
                                                    <span className={`inline-block py-0.5 px-2 text-[10px] uppercase tracking-wider border rounded-none font-semibold ${statusConf.className}`}>
                                                        {statusConf.label}
                                                    </span>
                                                    {isPast && !isCancelled && !isRefused && (
                                                        <span className="inline-block py-0.5 px-2 text-[10px] uppercase tracking-wider border border-brun-200 bg-brun-50 text-brun-400 rounded-none font-medium">
                                                            Passée
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brun-600">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-brun-400" />
                                                        {b.location}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-brun-400" />
                                                        {new Date(b.bookingDate + 'T00:00:00.000Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-brun-400" />
                                                        {b.timeStart.replace(':', 'h')} – {b.timeEnd.replace(':', 'h')}
                                                    </span>
                                                </div>
                                                <div className="mt-2 pl-3 text-xs text-brun-700 font-sans italic">
                                                    <span className="font-semibold not-italic">Motif de réservation : </span>{b.bookingReason}
                                                </div>
                                                {isRefused && (
                                                    <div className="mt-2 pl-3 text-xs text-red-700 font-sans italic">
                                                        <span className="font-semibold not-italic">Motif de refus : </span>{b.refusalReason}
                                                    </div>
                                                )}
                                                {isCancelled && (
                                                    <div className="mt-2 pl-3 text-xs text-brun-400 font-sans italic">
                                                        <span className="font-semibold not-italic">Motif d'annulation : </span>{b.cancelReason}
                                                    </div>
                                                )}
                                            </Link>

                                            {(isPending || isConfirmed) && !isPast && (
                                                <div className="flex-shrink-0 px-5 pb-5 md:pb-0 md:pl-0 md:pr-5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openCancelModal(b.bookingId)}
                                                        className="flex items-center gap-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 hover:border-red-300 px-3 py-1.5 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors rounded-sm"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        Annuler
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
