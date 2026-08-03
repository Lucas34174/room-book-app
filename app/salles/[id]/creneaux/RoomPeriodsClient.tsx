'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import Topbar from '../../../components/Topbar'
import { scheduleToast } from '../../../components/ToastProvider'
import { GitMerge, X } from 'lucide-react'

type Period = {
    periodId: number
    dayOfWeek: number
    timeStart: string
    timeEnd: string
    note: string | null
}

const DAYS_MAP: Record<number, string> = {
    1: 'Lundi',
    2: 'Mardi',
    3: 'Mercredi',
    4: 'Jeudi',
    5: 'Vendredi',
    6: 'Samedi'
}

export default function RoomPeriodsClient({ id }: { id: string }) {
    const [roomName, setRoomName] = useState<string>('')
    const [periods, setPeriods] = useState<Period[]>([])

    const [dayOfWeek, setDayOfWeek] = useState<string>('1')
    const [timeStart, setTimeStart] = useState<string>('')
    const [timeEnd, setTimeEnd] = useState<string>('')
    const [note, setNote] = useState<string>('')

    const [loading, setLoading] = useState<boolean>(true)
    const [actionLoading, setActionLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [apiError, setApiError] = useState<string | null>(null)

    // Deletion confirmation workflow state
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
    const [activeBookingsCount, setActiveBookingsCount] = useState<number>(0)

    // Merge suggestion workflow state
    const [mergeSuggestion, setMergeSuggestion] = useState<{
        proposedStart: string
        proposedEnd: string
        beforePeriod: Period | null
        afterPeriod: Period | null
    } | null>(null)
    const [mergedNote, setMergedNote] = useState<string>('')

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/rooms/${id}/periods`)
            if (!res.ok) {
                throw new Error('Erreur lors du chargement des créneaux.')
            }
            const data = await res.json()
            setRoomName(data.roomName || '')
            setPeriods(data.periods || [])
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [id])

    async function handleAdd(e: FormEvent) {
        e.preventDefault()
        setApiError(null)

        if (!timeStart || !timeEnd) {
            setApiError('L’heure de début et l’heure de fin sont requises.')
            return
        }

        const [startH, startM] = timeStart.split(':').map(Number)
        const [endH, endM] = timeEnd.split(':').map(Number)
        const startMinutes = startH * 60 + startM
        const endMinutes = endH * 60 + endM

        if (endMinutes <= startMinutes) {
            setApiError('L’heure de fin doit être strictement supérieure à l’heure de début.')
            return
        }

        if (endMinutes - startMinutes < 30) {
            setApiError('La durée d’un créneau doit être d’au moins 30 minutes.')
            return
        }

        setActionLoading(true)
        try {
            const res = await fetch(`/api/rooms/${id}/periods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dayOfWeek: parseInt(dayOfWeek),
                    timeStart,
                    timeEnd,
                    note: note.trim() || null
                })
            })

            let data: Record<string, any> = {}
            try {
                data = await res.json()
            } catch { /* ignore */ }

            if (res.status === 202 && data.suggestMerge) {
                setMergeSuggestion(data as any)
                setMergedNote(note.trim() || '')
                return
            }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la création.')
            }

            await fetchData()
            setTimeStart('')
            setTimeEnd('')
            setNote('')
            scheduleToast({
                message: 'Le créneau a été ajouté avec succès.',
                type: 'success'
            })
        } catch (err: any) {
            setApiError(err.message || 'Impossible d’ajouter le créneau.')
        } finally {
            setActionLoading(false)
        }
    }

    async function handleMergeConfirm() {
        if (!mergeSuggestion) return
        setActionLoading(true)
        setApiError(null)
        try {
            const res = await fetch(`/api/rooms/${id}/periods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dayOfWeek: parseInt(dayOfWeek),
                    timeStart,
                    timeEnd,
                    note: note.trim() || null,
                    merge: true,
                    mergedNote: mergedNote.trim() || null
                })
            })

            let data: Record<string, any> = {}
            try {
                data = await res.json()
            } catch { /* ignore */ }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la fusion.')
            }

            await fetchData()
            setTimeStart('')
            setTimeEnd('')
            setNote('')
            setMergeSuggestion(null)
            scheduleToast({
                message: 'Les créneaux ont été fusionnés avec succès.',
                type: 'success'
            })
        } catch (err: any) {
            setApiError(err.message || 'Impossible de fusionner les créneaux.')
        } finally {
            setActionLoading(false)
        }
    }

    async function handleForceCreate() {
        if (!mergeSuggestion) return
        setActionLoading(true)
        setApiError(null)
        try {
            const res = await fetch(`/api/rooms/${id}/periods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dayOfWeek: parseInt(dayOfWeek),
                    timeStart,
                    timeEnd,
                    note: note.trim() || null,
                    forceSeparate: true
                })
            })

            let data: Record<string, any> = {}
            try {
                data = await res.json()
            } catch { /* ignore */ }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la création.')
            }

            await fetchData()
            setTimeStart('')
            setTimeEnd('')
            setNote('')
            setMergeSuggestion(null)
            scheduleToast({
                message: 'Le créneau a été ajouté séparément avec succès.',
                type: 'success'
            })
        } catch (err: any) {
            setApiError(err.message || 'Impossible d’ajouter le créneau.')
        } finally {
            setActionLoading(false)
        }
    }

    async function handleDelete(periodId: number, force: boolean = false) {
        setApiError(null)
        setActionLoading(true)
        try {
            const params = force ? '?force=true' : ''
            const res = await fetch(`/api/rooms/${id}/periods/${periodId}${params}`, {
                method: 'DELETE'
            })

            let data: Record<string, any> = {}
            try {
                data = await res.json()
            } catch { /* ignore */ }

            if (!res.ok) {
                if (res.status === 409 && data.requiresConfirmation) {
                    setConfirmDeleteId(periodId)
                    setActiveBookingsCount(data.activeBookingsCount || 0)
                    return
                }
                throw new Error(data.error || 'Erreur lors de la suppression.')
            }

            await fetchData()
            setConfirmDeleteId(null)
            scheduleToast({
                message: 'Le créneau a été supprimé avec succès.',
                type: 'success'
            })
        } catch (err: any) {
            setApiError(err.message || 'Impossible de supprimer le créneau.')
            setConfirmDeleteId(null)
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
                <Topbar />
                <div className="max-w-[760px] w-full mx-auto px-8 py-9 text-center text-brun-600 font-sans text-sm">
                    Chargement des créneaux de la salle...
                </div>
            </div>
        )
    }

    if (error && !roomName) {
        return (
            <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
                <Topbar />
                <div className="max-w-[760px] w-full mx-auto px-8 py-9 text-center">
                    <p className="text-red-700 font-sans text-sm mb-4">{error}</p>
                    <Link href="/salles" className="underline text-brun-700 text-xs uppercase tracking-wider font-sans">
                        Retour à la liste des salles
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
            {/* Modal de suggestion de fusion */}
            {mergeSuggestion && (
                <div className="fixed inset-0 bg-brun-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setMergeSuggestion(null)}>
                    <div className="bg-white border border-[#d3bd9d] p-6.5 max-w-md w-full shadow-2xl rounded-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <GitMerge className="w-4 h-4 text-amber-700" />
                                <h2 className="text-base font-semibold text-brun-900">
                                    Créneau adjacent détecté
                                </h2>
                            </div>
                            <button onClick={() => setMergeSuggestion(null)} className="text-brun-400 hover:text-brun-700 cursor-pointer p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-brun-600 font-sans mb-4 leading-relaxed">
                            Ce créneau est adjacent à un ou plusieurs créneaux existants pour cette salle.
                            Souhaitez-vous les fusionner en une seule plage horaire ?
                        </p>

                        <div className="bg-brun-050 border border-brun-200 rounded-sm p-3.5 mb-4 font-sans text-xs space-y-1.5">
                            {mergeSuggestion.beforePeriod && (
                                <div className="flex justify-between">
                                    <span className="text-brun-500">Créneau précédent :</span>
                                    <span className="font-semibold text-brun-850">{mergeSuggestion.beforePeriod.timeStart.replace(':', 'h')} – {mergeSuggestion.beforePeriod.timeEnd.replace(':', 'h')}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-brun-500">Nouveau créneau :</span>
                                <span className="font-semibold text-brun-850">{timeStart.replace(':', 'h')} – {timeEnd.replace(':', 'h')}</span>
                            </div>
                            {mergeSuggestion.afterPeriod && (
                                <div className="flex justify-between">
                                    <span className="text-brun-500">Créneau suivant :</span>
                                    <span className="font-semibold text-brun-850">{mergeSuggestion.afterPeriod.timeStart.replace(':', 'h')} – {mergeSuggestion.afterPeriod.timeEnd.replace(':', 'h')}</span>
                                </div>
                            )}
                            <div className="border-t border-brun-200 my-1.5" />
                            <div className="flex justify-between text-amber-800 font-bold">
                                <span>Plage combinée :</span>
                                <span>{mergeSuggestion.proposedStart.replace(':', 'h')} – {mergeSuggestion.proposedEnd.replace(':', 'h')}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 mb-6 font-sans">
                            <label htmlFor="merged-note" className="block text-[11px] uppercase tracking-wide text-brun-700 font-semibold">
                                Note pour le créneau combiné (optionnelle)
                            </label>
                            <input
                                id="merged-note"
                                type="text"
                                className="w-full px-2.5 py-1.5 border border-brun-400 bg-brun-050 text-sm focus:outline-none focus:border-brun-700 focus:bg-white rounded-none"
                                value={mergedNote}
                                onChange={(e) => setMergedNote(e.target.value)}
                                placeholder="Ex: Cours d'informatique, TP..."
                            />
                        </div>

                        <div className="flex gap-2.5 justify-end font-sans">
                            <button
                                onClick={handleForceCreate}
                                disabled={actionLoading}
                                className="px-4 py-2 border border-brun-300 text-brun-700 hover:bg-brun-100 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 font-medium"
                            >
                                Créer séparément
                            </button>
                            <button
                                onClick={handleMergeConfirm}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-amber-700 text-white hover:bg-amber-800 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 font-medium flex items-center gap-1.5"
                            >
                                <GitMerge className="w-3.5 h-3.5" />
                                {actionLoading ? 'Fusion...' : 'Fusionner'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <Topbar />

            <div className="max-w-[760px] w-full mx-auto px-8 py-9 flex-1">
                <div className="flex justify-between items-baseline border-b border-[#d3bd9d] pb-3.5 mb-7">
                    <h1 className="text-xl font-normal tracking-wide text-brun-900">
                        Créneaux — {roomName}
                    </h1>
                    <Link
                        href="/salles"
                        className="text-xs text-brun-600 uppercase tracking-wider underline hover:text-brun-900"
                    >
                        Retour
                    </Link>
                </div>

                {confirmDeleteId !== null && (
                    <div className="border border-brun-400 bg-brun-100/50 p-6 flex flex-col gap-4 mb-6.5">
                        <h2 className="text-brun-900 text-base font-normal">
                            Suppression du créneau : confirmation requise
                        </h2>
                        <p className="text-sm text-brun-850 font-sans">
                            Ce créneau possède <strong>{activeBookingsCount} réservation(s) active(s)</strong> (aujourd&apos;hui ou dans le futur).
                            <br /><br />
                            Si vous validez, ces réservations seront <strong>définitivement annulées</strong>.
                        </p>
                        <div className="flex gap-3 mt-2 font-sans">
                            <button
                                onClick={() => handleDelete(confirmDeleteId, true)}
                                disabled={actionLoading}
                                className="px-5 py-2 bg-red-700 text-white text-xs uppercase tracking-wider border border-red-700 hover:bg-red-800 cursor-pointer disabled:opacity-50"
                            >
                                {actionLoading ? 'Suppression...' : 'Confirmer la suppression forcée'}
                            </button>
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-5 py-2 bg-transparent text-brun-850 border border-brun-400 hover:bg-brun-100 text-xs uppercase tracking-wider cursor-pointer"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                )}

                {/* Liste des créneaux */}
                <div className="bg-white border border-[#d3bd9d] overflow-hidden mb-6.5">
                    {periods.length === 0 ? (
                        <div className="p-8 text-center text-brun-600 font-sans text-sm">
                            Aucun créneau défini pour cette salle.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-[13.5px]">
                            <thead>
                                <tr className="bg-brun-050">
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Jour
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Début
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Fin
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Note
                                    </th>
                                    <th className="border-b border-brun-400 px-3.5 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map((p) => (
                                    <tr key={p.periodId} className="hover:bg-brun-100/50 transition-colors duration-150">
                                        <td className="px-3.5 py-3 border-b border-brun-200 font-sans font-medium text-brun-900">
                                            {DAYS_MAP[p.dayOfWeek]}
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 font-sans text-brun-850">
                                            {p.timeStart.replace(':', 'h')}
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 font-sans text-brun-850">
                                            {p.timeEnd.replace(':', 'h')}
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 text-brun-700 italic">
                                            {p.note || '—'}
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(p.periodId)}
                                                disabled={actionLoading}
                                                className="text-red-700 hover:text-red-900 underline underline-offset-2 text-xs font-sans cursor-pointer disabled:opacity-50"
                                            >
                                                Supprimer
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Formulaire d'ajout de créneau */}
                <div className="bg-white border border-[#d3bd9d] p-6.5">
                    <div className="text-xs uppercase tracking-widest text-brun-600 border-b border-brun-200 pb-2 mb-4.5 font-sans">
                        Ajouter un créneau
                    </div>

                    <form onSubmit={handleAdd} className="flex flex-col gap-4.5" noValidate>
                        {apiError && (
                            <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800">
                                {apiError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col font-sans">
                                <label htmlFor="day-select" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                                    Jour
                                </label>
                                <select
                                    id="day-select"
                                    value={dayOfWeek}
                                    onChange={(e) => setDayOfWeek(e.target.value)}
                                    className="px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                                >
                                    <option value="1">Lundi</option>
                                    <option value="2">Mardi</option>
                                    <option value="3">Mercredi</option>
                                    <option value="4">Jeudi</option>
                                    <option value="5">Vendredi</option>
                                    <option value="6">Samedi</option>
                                </select>
                            </div>

                            <div className="flex flex-col font-sans">
                                <label htmlFor="time-start" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                                    Heure de début
                                </label>
                                <input
                                    id="time-start"
                                    type="time"
                                    value={timeStart}
                                    onChange={(e) => setTimeStart(e.target.value)}
                                    className="px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                                />
                            </div>

                            <div className="flex flex-col font-sans">
                                <label htmlFor="time-end" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                                    Heure de fin
                                </label>
                                <input
                                    id="time-end"
                                    type="time"
                                    value={timeEnd}
                                    onChange={(e) => setTimeEnd(e.target.value)}
                                    className="px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label htmlFor="note" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans">
                                Note (optionnel)
                            </label>
                            <input
                                id="note"
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Ex : TP informatique, cours magistraux..."
                                className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                            />
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="px-6 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider border border-brun-800 hover:bg-brun-900 cursor-pointer disabled:opacity-50"
                            >
                                {actionLoading ? 'Ajout...' : 'Ajouter'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
