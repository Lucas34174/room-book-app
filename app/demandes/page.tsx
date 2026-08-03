'use client'

import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar'
import { scheduleToast } from '../components/ToastProvider'
import { CheckCircle2, Clock, X } from 'lucide-react'

type Booking = {
    bookingId: number
    bookingDate: string
    createdAt: string
    status: 'en_attente' | 'confirmee' | 'refusee' | 'annulee'
    bookingReason: string
    refusalReason: string | null
    cancelReason: string | null
    roomName: string
    location: string
    timeStart: string
    timeEnd: string
    requester: {
        userId: number
        name: string
        username: string
        role: string
    }
}

type ActionState = {
    bookingId: number
    action: 'confirm' | 'refuse'
    refusalReason: string
    submitting: boolean
}

const STATUS_CONFIG = {
    en_attente: { label: 'En attente', className: 'text-amber-800 border-amber-300 bg-amber-50' },
    confirmee: { label: 'Confirmée', className: 'text-emerald-800 border-emerald-300 bg-emerald-50' },
    refusee: { label: 'Refusée', className: 'text-red-700 border-red-200 bg-red-50' },
    annulee: { label: 'Annulée', className: 'text-gray-500 border-gray-200 bg-gray-50' },
}

export default function DemandesPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionState, setActionState] = useState<ActionState | null>(null)
    const [validationError, setValidationError] = useState<string | null>(null)

    // Filtres — statut par défaut : en_attente
    const [filterStatus, setFilterStatus] = useState<string>('en_attente')
    const [filterRoom, setFilterRoom] = useState('')
    const [filterRequester, setFilterRequester] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [filterDate, setFilterDate] = useState('')

    const filteredBookings = bookings.filter((b) => {
        if (filterStatus && b.status !== filterStatus) return false
        if (filterRoom.trim() && !b.roomName.toLowerCase().includes(filterRoom.toLowerCase())) return false
        if (
            filterRequester.trim() &&
            !b.requester.name.toLowerCase().includes(filterRequester.toLowerCase()) &&
            !b.requester.username.toLowerCase().includes(filterRequester.toLowerCase())
        ) return false
        if (filterRole && b.requester.role !== filterRole) return false
        if (filterDate && b.bookingDate !== filterDate) return false
        return true
    })

    const fetchBookings = async () => {
        try {
            const res = await fetch('/api/bookings/pending')
            if (!res.ok) throw new Error('Impossible de charger les demandes.')
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

    function openPanel(bookingId: number, action: 'confirm' | 'refuse') {
        setActionState({ bookingId, action, refusalReason: '', submitting: false })
        setValidationError(null)
    }

    function closePanel() {
        setActionState(null)
        setValidationError(null)
    }

    async function handleSubmit() {
        if (!actionState) return
        setValidationError(null)

        if (actionState.action === 'refuse' && !actionState.refusalReason.trim()) {
            setValidationError('Le motif de refus est obligatoire.')
            return
        }

        setActionState((prev) => prev ? { ...prev, submitting: true } : null)

        try {
            const res = await fetch(`/api/bookings/${actionState.bookingId}/validate`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: actionState.action,
                    refusalReason: actionState.refusalReason.trim() || undefined
                })
            })

            let data: Record<string, any> = {}
            try { data = await res.json() } catch { /* ignore */ }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors du traitement.')
            }

            scheduleToast({
                message: data.message || (actionState.action === 'confirm' ? 'Demande confirmée.' : 'Demande refusée.'),
                type: actionState.action === 'confirm' ? 'success' : 'error'
            })

            closePanel()
            setLoading(true)
            await fetchBookings()
        } catch (err: any) {
            setValidationError(err.message || 'Une erreur est survenue.')
            setActionState((prev) => prev ? { ...prev, submitting: false } : null)
        }
    }

    // Label du titre dynamique selon filtre statut
    const pageTitle = filterStatus === 'en_attente'
        ? 'Demandes en attente'
        : filterStatus === 'confirmee'
            ? 'Demandes confirmées'
            : filterStatus === 'refusee'
                ? 'Demandes refusées'
                : filterStatus === 'annulee'
                    ? 'Demandes annulées'
                    : 'Toutes les demandes'

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col">
            <Topbar />

            {/* Overlay panel de confirmation/refus */}
            {actionState && (
                <div className="fixed inset-0 bg-brun-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closePanel}>
                    <div
                        className="bg-white border border-[#d3bd9d] p-7 max-w-md w-full shadow-2xl rounded-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-1.5">
                            <h2 className="text-base font-semibold text-brun-900">
                                {actionState.action === 'confirm' ? 'Confirmer la demande' : 'Refuser la demande'}
                            </h2>
                            <button onClick={closePanel} className="text-brun-400 hover:text-brun-700 cursor-pointer p-1 -mr-1 -mt-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-brun-600 font-sans mb-5">
                            {actionState.action === 'confirm'
                                ? 'Le demandeur sera notifié par email que sa réservation est confirmée.'
                                : 'Un motif de refus est obligatoire. Il sera transmis au demandeur par email.'}
                        </p>

                        {validationError && (
                            <div role="alert" className="border-l-[3px] border-red-600 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800 mb-4 font-sans">
                                {validationError}
                            </div>
                        )}

                        {actionState.action === 'refuse' && (
                            <div className="flex flex-col mb-5">
                                <label htmlFor="refusalReason" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans font-semibold">
                                    Motif de refus *
                                </label>
                                <textarea
                                    id="refusalReason"
                                    rows={3}
                                    value={actionState.refusalReason}
                                    onChange={(e) => setActionState((prev) => prev ? { ...prev, refusalReason: e.target.value } : null)}
                                    placeholder="Ex : La salle est déjà réservée pour un examen officiel."
                                    className={`w-full px-2.5 py-2 border bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans ${validationError ? 'border-red-600' : 'border-brun-400'}`}
                                />
                            </div>
                        )}

                        <div className="flex gap-2.5 justify-end">
                            <button
                                onClick={closePanel}
                                disabled={actionState.submitting}
                                className="px-4 py-2 border border-brun-300 text-brun-700 hover:bg-brun-100 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 rounded-sm font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={actionState.submitting}
                                className={`px-4 py-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 rounded-sm font-medium ${actionState.action === 'confirm'
                                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                            >
                                {actionState.submitting
                                    ? 'En cours...'
                                    : actionState.action === 'confirm' ? 'Valider' : 'Refuser'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[960px] w-full mx-auto px-8 py-10 flex-1">
                {/* Header */}
                <div className="mb-8">
                    <div>
                        <h1 className="text-2xl font-light text-brun-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                            {pageTitle}
                        </h1>
                        <p className="text-xs text-brun-500 mt-1">
                            {loading ? '\u00a0' : `${filteredBookings.length} demande${filteredBookings.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <div className="h-px bg-gradient-to-r from-brun-300 via-brun-200 to-transparent mt-5" />
                </div>

                {loading ? (
                    <div className="bg-white border border-[#d3bd9d] p-10 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                        <div className="w-5 h-5 border-2 border-brun-200 border-t-brun-600 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-brun-500">Chargement des demandes...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 p-8 text-center text-red-700 text-sm rounded-sm">
                        {error}
                    </div>
                ) : (
                    <>
                        {/* Barre de filtres */}
                        <div className="bg-white border border-[#d3bd9d] p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shadow-sm">
                            {/* Filtre Statut */}
                            <div>
                                <label htmlFor="filterStatus" className="block text-[10px] uppercase tracking-wide text-brun-700 font-semibold mb-1">
                                    Statut
                                </label>
                                <select
                                    id="filterStatus"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-brun-300 bg-brun-050 text-xs focus:outline-none focus:border-brun-600 rounded-none h-[30px]"
                                >
                                    <option value="">Tous</option>
                                    <option value="en_attente">En attente</option>
                                    <option value="confirmee">Confirmée</option>
                                    <option value="refusee">Refusée</option>
                                    <option value="annulee">Annulée</option>
                                </select>
                            </div>
                            {/* Filtre Salle */}
                            <div>
                                <label htmlFor="filterRoom" className="block text-[10px] uppercase tracking-wide text-brun-700 font-semibold mb-1">
                                    Salle
                                </label>
                                <input
                                    id="filterRoom"
                                    type="text"
                                    value={filterRoom}
                                    onChange={(e) => setFilterRoom(e.target.value)}
                                    placeholder="Rechercher une salle..."
                                    className="w-full px-2 py-1.5 border border-brun-300 bg-brun-050 text-xs focus:outline-none focus:border-brun-600 rounded-none"
                                />
                            </div>
                            {/* Filtre Demandeur */}
                            <div>
                                <label htmlFor="filterRequester" className="block text-[10px] uppercase tracking-wide text-brun-700 font-semibold mb-1">
                                    Demandeur
                                </label>
                                <input
                                    id="filterRequester"
                                    type="text"
                                    value={filterRequester}
                                    onChange={(e) => setFilterRequester(e.target.value)}
                                    placeholder="Nom ou pseudo..."
                                    className="w-full px-2 py-1.5 border border-brun-300 bg-brun-050 text-xs focus:outline-none focus:border-brun-600 rounded-none"
                                />
                            </div>
                            {/* Filtre Rôle */}
                            <div>
                                <label htmlFor="filterRole" className="block text-[10px] uppercase tracking-wide text-brun-700 font-semibold mb-1">
                                    Rôle
                                </label>
                                <select
                                    id="filterRole"
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-brun-300 bg-brun-050 text-xs focus:outline-none focus:border-brun-600 rounded-none h-[30px]"
                                >
                                    <option value="">Tous les rôles</option>
                                    <option value="teacher">Enseignant</option>
                                    <option value="student">Étudiant / Association</option>
                                </select>
                            </div>
                            {/* Filtre Date */}
                            <div>
                                <label htmlFor="filterDate" className="block text-[10px] uppercase tracking-wide text-brun-700 font-semibold mb-1">
                                    Date
                                </label>
                                <input
                                    id="filterDate"
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="w-full px-2 py-1 border border-brun-300 bg-brun-050 text-xs focus:outline-none focus:border-brun-600 rounded-none h-[30px]"
                                />
                            </div>
                        </div>

                        {/* Liste */}
                        {filteredBookings.length === 0 ? (
                            <div className="bg-white border border-[#d3bd9d] p-12 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <div className="flex justify-center mb-3">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
                                </div>
                                <p className="text-sm font-medium text-brun-700 mb-1">
                                    Aucune demande
                                </p>
                                <p className="text-xs text-brun-500 mb-4">
                                    Aucune demande ne correspond à vos critères.
                                </p>
                                <button
                                    onClick={() => {
                                        setFilterStatus('en_attente')
                                        setFilterRoom('')
                                        setFilterRequester('')
                                        setFilterRole('')
                                        setFilterDate('')
                                    }}
                                    className="px-4 py-1.5 bg-brun-800 text-brun-050 text-xs uppercase tracking-wide cursor-pointer hover:bg-brun-900 transition-colors rounded-none font-medium"
                                >
                                    Réinitialiser les filtres
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {filteredBookings.map((b) => {
                                    const submittedAt = new Date(b.createdAt).toLocaleDateString('fr-FR', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })
                                    const bookingDay = new Date(b.bookingDate + 'T00:00:00.000Z').toLocaleDateString('fr-FR', {
                                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                    })
                                    const statusConf = STATUS_CONFIG[b.status] ?? { label: b.status, className: 'text-gray-500 border-gray-300 bg-gray-50' }
                                    const isPending = b.status === 'en_attente'

                                    return (
                                        <div
                                            key={b.bookingId}
                                            className={`bg-white border p-5 transition-colors duration-150 rounded-none ${isPending ? 'border-[#d3bd9d] hover:border-brun-600' : 'border-brun-200 opacity-80'}`}
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                                                {/* Infos */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                                                        <h2 className="text-base font-normal text-brun-900 tracking-wide">
                                                            {b.roomName}
                                                        </h2>
                                                        <span className={`text-[9.5px] uppercase tracking-wider border px-2 py-0.5 font-sans font-semibold ${statusConf.className}`}>
                                                            {statusConf.label}
                                                        </span>
                                                        <span className="text-[9.5px] uppercase tracking-wider border text-brun-600 border-brun-300 bg-brun-050 px-2 py-0.5 font-sans">
                                                            {b.requester.role === 'teacher' ? 'Enseignant' : 'Étudiant'}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-brun-700 font-sans mb-3">
                                                        <div><span className="font-semibold text-brun-900">Demandeur :</span> {b.requester.name} <span className="text-brun-500">(@{b.requester.username})</span></div>
                                                        <div><span className="font-semibold text-brun-900">Soumise le :</span> {submittedAt}</div>
                                                        <div><span className="font-semibold text-brun-900">Salle :</span> {b.roomName} — {b.location}</div>
                                                        <div><span className="font-semibold text-brun-900">Date :</span> {bookingDay}</div>
                                                        <div className="sm:col-span-2 flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-brun-400" />
                                                            <span>{b.timeStart.replace(':', 'h')} – {b.timeEnd.replace(':', 'h')}</span>
                                                        </div>
                                                    </div>

                                                    <blockquote className="pl-3 text-xs text-brun-700 font-sans italic mb-2">
                                                        <span className='font-semibold not-italic'>Motif de Réservation:</span>  {b.bookingReason}
                                                    </blockquote>

                                                    {/* Motif de refus affiché si refusée */}
                                                    {b.status === 'refusee' && b.refusalReason && (
                                                        <div className="mt-2 pl-3 text-xs text-red-700 font-sans italic">
                                                            <span className="font-semibold not-italic">Motif de refus : </span>{b.refusalReason}
                                                        </div>
                                                    )}

                                                    {/* Motif d'annulation affiché si annulée */}
                                                    {b.status === 'annulee' && b.cancelReason && (
                                                        <div className="mt-2  pl-3 text-xs text-gray-600 font-sans italic">
                                                            <span className="font-semibold not-italic">Motif d&apos;annulation : </span>{b.cancelReason}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions — uniquement pour les demandes en attente */}
                                                {isPending && (
                                                    <div className="flex lg:flex-col gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => openPanel(b.bookingId, 'confirm')}
                                                            className="px-4 py-1.5 bg-emerald-700 text-white text-xs uppercase tracking-wider hover:bg-emerald-800 cursor-pointer transition-colors whitespace-nowrap rounded-none font-medium"
                                                        >
                                                            Valider
                                                        </button>
                                                        <button
                                                            onClick={() => openPanel(b.bookingId, 'refuse')}
                                                            className="px-4 py-1.5 bg-white text-red-600 text-xs uppercase tracking-wider border border-red-200 hover:bg-red-50 cursor-pointer transition-colors whitespace-nowrap rounded-none font-medium"
                                                        >
                                                            Refuser
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
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
