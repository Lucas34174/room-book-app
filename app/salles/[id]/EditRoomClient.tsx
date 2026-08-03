'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import Topbar from '../../components/Topbar'
import { scheduleToast } from '../../components/ToastProvider'

type Room = {
    roomId: number
    name: string
    capacity: number
    location: string
    description: string | null
    bookable: boolean
}

export default function EditRoomClient({ id }: { id: string }) {
    const router = useRouter()
    const [room, setRoom] = useState<Room | null>(null)
    
    const [name, setName] = useState('')
    const [capacity, setCapacity] = useState('')
    const [location, setLocation] = useState('')
    const [description, setDescription] = useState('')
    const [bookable, setBookable] = useState('true')

    const [loading, setLoading] = useState<boolean>(true)
    const [saving, setSaving] = useState<boolean>(false)
    const [deleting, setDeleting] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<{ name?: string; capacity?: string; location?: string }>({})

    // Confirmation workflow state for active bookings
    const [showDeleteWarning, setShowDeleteWarning] = useState(false)
    const [activeBookingsCount, setActiveBookingsCount] = useState(0)

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const res = await fetch(`/api/rooms/${id}`)
                if (!res.ok) {
                    if (res.status === 404) {
                        throw new Error('Salle introuvable.')
                    }
                    throw new Error('Erreur lors du chargement de la salle.')
                }
                const data = await res.json()
                setRoom(data.room)

                if (data.room) {
                    setName(data.room.name)
                    setCapacity(String(data.room.capacity))
                    setLocation(data.room.location)
                    setDescription(data.room.description || '')
                    setBookable(data.room.bookable ? 'true' : 'false')
                }
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.')
            } finally {
                setLoading(false)
            }
        }

        fetchRoom()
    }, [id])

    function validateFields(): boolean {
        const errors: typeof fieldErrors = {}
        if (!name.trim()) errors.name = 'Ce champ est obligatoire.'
        if (!location.trim()) errors.location = 'Ce champ est obligatoire.'
        
        const capNum = parseInt(capacity)
        if (!capacity.trim()) {
            errors.capacity = 'Ce champ est obligatoire.'
        } else if (isNaN(capNum) || capNum <= 0) {
            errors.capacity = 'La capacité doit être un nombre supérieur à 0.'
        }

        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    async function handleSave(e: FormEvent) {
        e.preventDefault()
        setFieldErrors({})
        setError(null)
        if (!validateFields()) return

        setSaving(true)
        try {
            const res = await fetch(`/api/rooms/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    capacity: parseInt(capacity),
                    location: location.trim(),
                    description: description.trim() || null,
                    bookable: bookable === 'true'
                })
            })

            let data: Record<string, unknown> = {}
            try {
                data = await res.json()
            } catch {
                throw new Error('Réponse invalide du serveur.')
            }

            if (!res.ok) {
                throw new Error((data.error as string) || 'Une erreur est survenue.')
            }

            scheduleToast({
                message: 'La salle a été mise à jour avec succès.',
                type: 'success',
            })
            router.push('/salles')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Impossible d’enregistrer les modifications.')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(force: boolean = false) {
        setError(null)
        setDeleting(true)
        try {
            const params = force ? '?force=true' : ''
            const res = await fetch(`/api/rooms/${id}${params}`, {
                method: 'DELETE'
            })

            let data: Record<string, any> = {}
            try {
                data = await res.json()
            } catch { /* ignore */ }

            if (!res.ok) {
                if (res.status === 409 && data.requiresConfirmation) {
                    setActiveBookingsCount(data.activeBookingsCount || 0)
                    setShowDeleteWarning(true)
                    return
                }
                throw new Error(data.error || 'Une erreur est survenue lors de la suppression.')
            }

            scheduleToast({
                message: 'La salle a été supprimée avec succès.',
                type: 'success',
            })
            router.push('/salles')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Impossible de supprimer la salle.')
            setShowDeleteWarning(false)
        } finally {
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
                <Topbar />
                <div className="max-w-[640px] w-full mx-auto px-8 py-9 text-center text-brun-600 font-sans text-sm">
                    Chargement de la salle...
                </div>
            </div>
        )
    }

    if (error && !room) {
        return (
            <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
                <Topbar />
                <div className="max-w-[640px] w-full mx-auto px-8 py-9 text-center">
                    <p className="text-red-700 font-sans text-sm mb-4">{error}</p>
                    <Link href="/salles" className="underline text-brun-700 text-xs uppercase tracking-wider font-sans">
                        Retour à la liste
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
            <Topbar />

            <div className="max-w-[640px] w-full mx-auto px-8 py-9 flex-1">
                <div className="flex justify-between items-baseline border-b border-[#d3bd9d] pb-3.5 mb-7">
                    <h1 className="text-xl font-normal tracking-wide text-brun-900">
                        Modifier la salle : {room?.name}
                    </h1>
                    <Link
                        href="/salles"
                        className="text-xs text-brun-600 uppercase tracking-wider underline hover:text-brun-900"
                    >
                        Retour
                    </Link>
                </div>

                <div className="bg-white border border-[#d3bd9d] p-6.5">
                    {showDeleteWarning ? (
                        <div className="border border-brun-400 bg-brun-100/50 p-6 flex flex-col gap-4">
                            <h2 className="text-brun-900 text-base font-normal">
                                Suppression de la salle : confirmation requise
                            </h2>
                            <p className="text-sm text-brun-850 font-sans">
                                Cette salle possède <strong>{activeBookingsCount} réservation(s) active(s)</strong> (aujourd&apos;hui ou dans le futur).
                                <br /><br />
                                Si vous validez la suppression, toutes ces réservations seront <strong>définitivement annulées</strong>.
                            </p>
                            <div className="flex gap-3 mt-2 font-sans">
                                <button
                                    onClick={() => handleDelete(true)}
                                    disabled={deleting}
                                    className="px-5 py-2 bg-red-700 text-white text-xs uppercase tracking-wider border border-red-700 hover:bg-red-800 cursor-pointer disabled:opacity-50"
                                >
                                    {deleting ? 'Suppression...' : 'Confirmer la suppression forcée'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteWarning(false)}
                                    className="px-5 py-2 bg-transparent text-brun-850 border border-brun-400 hover:bg-brun-100 text-xs uppercase tracking-wider cursor-pointer"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} noValidate className="flex flex-col gap-4.5">
                            {!room?.bookable && (
                                <div className="flex items-start gap-3 border border-amber-400 bg-amber-50 px-4 py-3 rounded-sm">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="font-sans text-sm text-amber-800">
                                        <strong>Salle temporairement non réservable.</strong>
                                        {' '}Cette salle n&apos;apparaît pas dans les résultats de recherche. Les réservations existantes restent inchangées.
                                        Modifiez le champ &laquo;&nbsp;Salle réservable&nbsp;&raquo; ci-dessous pour la réactiver.
                                    </div>
                                </div>
                            )}
                            {error && (
                                <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <div className="flex-[2] flex flex-col">
                                    <label htmlFor="name" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans">
                                        Nom de la salle
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                        aria-invalid={!!fieldErrors.name}
                                        aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                                    />
                                    {fieldErrors.name && (
                                        <span id="name-error" className="text-xs text-red-700 mt-1">{fieldErrors.name}</span>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <label htmlFor="capacity" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans">
                                        Capacité
                                    </label>
                                    <input
                                        id="capacity"
                                        type="number"
                                        value={capacity}
                                        onChange={(e) => setCapacity(e.target.value)}
                                        className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                        aria-invalid={!!fieldErrors.capacity}
                                        aria-describedby={fieldErrors.capacity ? 'capacity-error' : undefined}
                                    />
                                    {fieldErrors.capacity && (
                                        <span id="capacity-error" className="text-xs text-red-700 mt-1">{fieldErrors.capacity}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <label htmlFor="location" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans">
                                    Localisation
                                </label>
                                <input
                                    id="location"
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                    aria-invalid={!!fieldErrors.location}
                                    aria-describedby={fieldErrors.location ? 'location-error' : undefined}
                                />
                                {fieldErrors.location && (
                                    <span id="location-error" className="text-xs text-red-700 mt-1">{fieldErrors.location}</span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <label htmlFor="description" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                />
                            </div>

                            <div className="flex flex-col">
                                <span className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans">
                                    Salle réservable
                                </span>
                                <div className="flex gap-4 font-sans text-sm">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="bookable"
                                            value="true"
                                            checked={bookable === 'true'}
                                            onChange={() => setBookable('true')}
                                            className="accent-brun-700"
                                        />
                                        Oui
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="bookable"
                                            value="false"
                                            checked={bookable === 'false'}
                                            onChange={() => setBookable('false')}
                                            className="accent-brun-700"
                                        />
                                        Non
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-between mt-6">
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider border border-brun-800 hover:bg-brun-900 cursor-pointer disabled:opacity-50"
                                    >
                                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                                    </button>
                                    <Link
                                        href="/salles"
                                        className="px-6 py-2 bg-transparent text-brun-850 hover:bg-brun-100 text-xs uppercase tracking-wider border border-brun-400 flex items-center justify-center font-sans"
                                    >
                                        Annuler
                                    </Link>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(false)}
                                    disabled={deleting}
                                    className="px-6 py-2 bg-red-700 text-white text-xs uppercase tracking-wider border border-red-700 hover:bg-red-800 cursor-pointer disabled:opacity-50 font-sans"
                                >
                                    {deleting ? 'Suppression...' : 'Supprimer la salle'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
