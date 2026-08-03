'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Topbar from '../../components/Topbar'
import { CheckCircle2, Clock } from 'lucide-react'

type BookingDetail = {
    bookingId: number
    bookingDate: string
    status: 'en_attente' | 'confirmee' | 'refusee' | 'annulee'
    bookingReason: string
    roomName: string
    location: string
    timeStart: string
    timeEnd: string
}

function ConfirmationDetail() {
    const searchParams = useSearchParams()
    const bookingId = searchParams.get('bookingId')

    const [booking, setBooking] = useState<BookingDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!bookingId) {
            setError('ID de réservation manquant.')
            setLoading(false)
            return
        }

        const fetchBooking = async () => {
            try {
                const res = await fetch(`/api/bookings/${bookingId}`)
                if (!res.ok) {
                    throw new Error('Impossible de charger les détails de la réservation.')
                }
                const data = await res.json()
                setBooking(data.booking)
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.')
            } finally {
                setLoading(false)
            }
        }

        fetchBooking()
    }, [bookingId])

    if (loading) {
        return (
            <div className="max-w-[560px] w-full mx-auto px-8 py-16 text-center text-brun-600 font-sans text-sm">
                Chargement des détails de confirmation...
            </div>
        )
    }

    if (error || !booking) {
        return (
            <div className="max-w-[560px] w-full mx-auto px-8 py-16 text-center">
                <p className="text-red-700 font-sans text-sm mb-4">{error || 'Réservation introuvable.'}</p>
                <Link href="/calendrier" className="underline text-brun-700 text-xs uppercase tracking-wider font-sans">
                    Retour au planning
                </Link>
            </div>
        )
    }

    const isConfirmed = booking.status === 'confirmee'

    return (
        <div className="max-w-[560px] w-full mx-auto px-6 py-10">
            <div className="bg-white border border-[#d3bd9d] p-9 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="flex justify-center mb-5">
                    <div className={`w-14 h-14 flex items-center justify-center rounded-sm ${isConfirmed ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                        {isConfirmed
                            ? <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={1.5} />
                            : <Clock className="w-7 h-7 text-amber-600" strokeWidth={1.5} />
                        }
                    </div>
                </div>

                <h1 className="text-xl font-light text-brun-900 tracking-wide mb-1.5" style={{ fontFamily: 'var(--font-playfair)' }}>
                    {isConfirmed ? 'Réservation confirmée !' : 'Demande enregistrée'}
                </h1>
                
                <p className="text-xs text-brun-600 font-sans mb-8">
                    {isConfirmed 
                        ? 'Votre réservation a été validée immédiatement.' 
                        : 'Votre demande est en cours de traitement par le Service Validateur.'}
                </p>

                {/* Détails de la réservation */}
                <div className="bg-brun-050 border border-brun-200 p-5 mb-8 font-sans text-xs text-brun-850 flex flex-col gap-2.5 text-left rounded-sm">
                    <div className="flex justify-between border-b border-brun-100 pb-1.5">
                        <span className="font-semibold text-brun-900">Numéro de réservation :</span>
                        <span>#{booking.bookingId}</span>
                    </div>
                    <div className="flex justify-between border-b border-brun-100 pb-1.5">
                        <span className="font-semibold text-brun-900">Salle :</span>
                        <span>{booking.roomName} ({booking.location})</span>
                    </div>
                    <div className="flex justify-between border-b border-brun-100 pb-1.5">
                        <span className="font-semibold text-brun-900">Date :</span>
                        <span>{new Date(booking.bookingDate + 'T00:00:00.000Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between border-b border-brun-100 pb-1.5">
                        <span className="font-semibold text-brun-900">Horaire :</span>
                        <span>{booking.timeStart.replace(':', 'h')} – {booking.timeEnd.replace(':', 'h')}</span>
                    </div>
                    <div className="flex justify-between border-b border-brun-100 pb-1.5">
                        <span className="font-semibold text-brun-900">Statut :</span>
                        <span>
                            {isConfirmed ? (
                                <span className="inline-block py-0.5 px-2 text-[10px] uppercase tracking-wider border text-[#3a4a28] border-[#7c9257] bg-[#eef1e6] rounded-sm font-semibold">
                                    Confirmée
                                </span>
                            ) : (
                                <span className="inline-block py-0.5 px-2 text-[10px] uppercase tracking-wider border text-amber-800 border-amber-400 bg-amber-100 rounded-sm font-semibold">
                                    En attente
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                        <span className="font-semibold text-brun-900">Motif indiqué :</span>
                        <span className="italic text-brun-700 leading-relaxed">&laquo;&nbsp;{booking.bookingReason}&nbsp;&raquo;</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                    <Link
                        href="/reservations"
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider hover:bg-brun-900 transition-colors font-medium rounded-sm"
                    >
                        Mes réservations
                    </Link>
                    <Link
                        href="/calendrier"
                        className="inline-flex items-center justify-center px-5 py-2.5 text-brun-800 hover:bg-brun-100 text-xs uppercase tracking-wider border border-brun-300 transition-colors font-medium rounded-sm"
                    >
                        Retour au planning
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function ConfirmationPage() {
    return (
        <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
            <Topbar />
            <Suspense fallback={
                <div className="max-w-[560px] w-full mx-auto px-8 py-16 text-center text-brun-600 font-sans text-sm">
                    Chargement...
                </div>
            }>
                <ConfirmationDetail />
            </Suspense>
        </div>
    )
}
