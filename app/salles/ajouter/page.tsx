'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '../../components/Topbar'
import { scheduleToast } from '../../components/ToastProvider'

export default function AddRoomPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [capacity, setCapacity] = useState('')
    const [location, setLocation] = useState('')
    const [description, setDescription] = useState('')
    const [bookable, setBookable] = useState('true')

    const [fieldErrors, setFieldErrors] = useState<{ name?: string; capacity?: string; location?: string }>({})
    const [apiError, setApiError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

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

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setApiError(null)
        if (!validateFields()) return

        setIsSubmitting(true)
        try {
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    capacity: parseInt(capacity),
                    location: location.trim(),
                    description: description.trim() || null,
                    bookable: bookable === 'true'
                }),
            })

            let data: Record<string, unknown> = {}
            try {
                data = await response.json()
            } catch {
                if (!response.ok) {
                    setApiError('Une erreur est survenue. Veuillez réessayer.')
                    return
                }
            }

            if (!response.ok) {
                setApiError(typeof data.error === 'string' ? data.error : 'Une erreur est survenue.')
                return
            }

            scheduleToast({
                message: 'La salle a été créée avec succès.',
                type: 'success',
            })
            router.push('/salles')
            router.refresh()
        } catch {
            setApiError('Impossible de contacter le serveur. Vérifiez votre connexion.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
            <Topbar />

            <div className="max-w-[640px] w-full mx-auto px-8 py-9 flex-1">
                <div className="flex justify-between items-baseline border-b border-[#d3bd9d] pb-3.5 mb-7">
                    <h1 className="text-xl font-normal tracking-wide text-brun-900">
                        Ajouter une salle
                    </h1>
                    <Link
                        href="/salles"
                        className="text-xs text-brun-600 uppercase tracking-wider underline hover:text-brun-900"
                    >
                        Retour
                    </Link>
                </div>

                <div className="bg-white border border-[#d3bd9d] p-6.5">
                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4.5">
                        {apiError && (
                            <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800">
                                {apiError}
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
                                    placeholder="ex : Salle B12"
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
                                    placeholder="30"
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
                                placeholder="ex : Bâtiment A, 2e étage"
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
                                placeholder="Salle équipée pour cours magistraux, tableau fixe..."
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

                        <div className="flex gap-3 mt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider border border-brun-800 hover:bg-brun-900 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                            <Link
                                href="/salles"
                                className="px-6 py-2 bg-transparent text-brun-850 hover:bg-brun-100 text-xs uppercase tracking-wider border border-brun-400 flex items-center justify-center font-sans"
                            >
                                Annuler
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
