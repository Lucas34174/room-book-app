'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '../components/Topbar'
import { scheduleToast } from '../components/ToastProvider'

type Room = {
    roomId: number
    name: string
    capacity: number
    location: string
    description: string | null
    bookable: boolean
}

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<boolean>(false)

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await fetch('/api/rooms')
                if (!response.ok) {
                    throw new Error('Erreur lors du chargement des salles.')
                }
                const data = await response.json()
                setRooms(data.rooms || [])
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.')
            } finally {
                setLoading(false)
            }
        }

        fetchRooms()
    }, [])

    async function handleToggleBookable(roomId: number, currentBookable: boolean) {
        setActionLoading(true)
        try {
            const res = await fetch(`/api/rooms/${roomId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookable: !currentBookable })
            })

            let data: Record<string, any> = {}
            try { data = await res.json() } catch { /* ignore */ }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la mise à jour.')
            }

            // Optimistic UI update
            setRooms((prev) =>
                prev.map((r) => r.roomId === roomId ? { ...r, bookable: !currentBookable } : r)
            )
            scheduleToast({
                message: currentBookable
                    ? 'Salle désactivée (non réservable).'
                    : 'Salle réactivée (réservable).',
                type: 'success'
            })
        } catch (err: any) {
            scheduleToast({ message: err.message || 'Impossible de modifier le statut.', type: 'error' })
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
            <Topbar />

            <div className="max-w-[1080px] w-full mx-auto px-8 py-9 flex-1">
                <div className="flex justify-between items-baseline border-b border-[#d3bd9d] pb-3.5 mb-7">
                    <h1 className="text-xl font-normal tracking-wide text-brun-900">
                        Liste des salles
                    </h1>
                    <Link
                        href="/salles/ajouter"
                        className="px-4 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider border border-brun-800 hover:bg-brun-900 cursor-pointer text-[11px]"
                    >
                        Ajouter une salle
                    </Link>
                </div>

                <div className="bg-white border border-[#d3bd9d] overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-brun-600 font-sans text-sm">
                            Chargement des salles...
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-700 font-sans text-sm">
                            {error}
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="p-8 text-center text-brun-600 font-sans text-sm">
                            Aucune salle enregistrée.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-[13.5px]">
                            <thead>
                                <tr className="bg-brun-050">
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Salle
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Capacité
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Statut réservation
                                    </th>
                                    <th className="border-b border-brun-400 px-3.5 py-2"></th>
                                    <th className="border-b border-brun-400 px-3.5 py-2"></th>
                                    <th className="border-b border-brun-400 px-3.5 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map((room) => (
                                    <tr
                                        key={room.roomId}
                                        className={`transition-colors duration-150 ${!room.bookable ? 'bg-amber-50/60' : 'hover:bg-brun-100/50'}`}
                                    >
                                        <td className="px-3.5 py-3 border-b border-brun-200 font-sans font-medium text-brun-900">
                                            <span className="flex items-center gap-2">
                                                {room.name}
                                                {!room.bookable && (
                                                    <span className="inline-block py-0.5 px-2 text-[10px] uppercase tracking-wider border text-amber-800 border-amber-400 bg-amber-100 rounded-sm">
                                                        indisponible
                                                    </span>
                                                )}
                                            </span>
                                            <span className="block text-xs font-normal text-brun-600 italic">
                                                {room.location}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 font-sans text-brun-850">
                                            {room.capacity} places
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleBookable(room.roomId, room.bookable)}
                                                disabled={actionLoading}
                                                title={room.bookable ? 'Désactiver les réservations' : 'Réactiver les réservations'}
                                                className={`inline-flex items-center gap-1.5 py-0.5 px-2.5 text-[10.5px] uppercase tracking-wider border cursor-pointer disabled:opacity-50 transition-colors ${
                                                    room.bookable
                                                        ? 'text-[#3a4a28] border-[#7c9257] bg-[#eef1e6] hover:bg-[#e2e8d8]'
                                                        : 'text-amber-800 border-amber-400 bg-amber-100 hover:bg-amber-200'
                                                }`}
                                            >
                                                {room.bookable ? 'Réservable' : 'Non réservable'}
                                            </button>
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 text-right">
                                            <Link
                                                href={`/salles/${room.roomId}`}
                                                className="text-brun-750 hover:text-brun-950 underline underline-offset-2 text-xs font-sans"
                                            >
                                                Modifier
                                            </Link>
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 text-right">
                                            <Link
                                                href={`/salles/${room.roomId}/equipements`}
                                                className="text-brun-750 hover:text-brun-950 underline underline-offset-2 text-xs font-sans"
                                            >
                                                Équipements
                                            </Link>
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 text-right">
                                            <Link
                                                href={`/salles/${room.roomId}/creneaux`}
                                                className="text-brun-750 hover:text-brun-950 underline underline-offset-2 text-xs font-sans"
                                            >
                                                Créneaux
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
