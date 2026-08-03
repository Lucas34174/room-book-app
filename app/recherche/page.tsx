'use client'

import { useEffect, useRef, useState, FormEvent } from 'react'
import Link from 'next/link'
import Topbar from '../components/Topbar'
import { Search, Inbox, ChevronDown, X, Check, MapPin, Users } from 'lucide-react'
import { DatePicker } from 'react-datepicker';

type Equipment = {
    equipmentId: number
    name: string
}

type RoomResult = {
    roomId: number
    name: string
    capacity: number
    location: string
    description: string | null
    equipments: {
        equipmentId: number
        name: string
        usable: boolean
        quantity: number
    }[]
}

export default function RecherchePage() {
    // Form state
    const [minCapacity, setMinCapacity] = useState('')
    const [name, setName] = useState('')
    const [date, setDate] = useState('')
    const [timeStart, setTimeStart] = useState('')
    const [timeEnd, setTimeEnd] = useState('')
    const [selectedEquipments, setSelectedEquipments] = useState<number[]>([])

    // Data state
    const [catalog, setCatalog] = useState<Equipment[]>([])
    const [results, setResults] = useState<RoomResult[] | null>(null)
    const [noResultMessage, setNoResultMessage] = useState<string | null>(null)

    // UI state
    const [loading, setLoading] = useState(false)
    const [catalogLoading, setCatalogLoading] = useState(true)
    const [formError, setFormError] = useState<string | null>(null)
    const [searched, setSearched] = useState(false)
    const [equipmentOpen, setEquipmentOpen] = useState(false)

    const equipmentRef = useRef<HTMLDivElement>(null)

    // Load equipment catalog on mount
    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const catalogRes = await fetch('/api/equipments')
                if (catalogRes.ok) {
                    const data = await catalogRes.json()
                    setCatalog(data.equipments || [])
                }
            } catch {
                // Catalog load failure is non-blocking
            } finally {
                setCatalogLoading(false)
            }
        }
        fetchCatalog()
    }, [])

    // Close equipment dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (equipmentRef.current && !equipmentRef.current.contains(e.target as Node)) {
                setEquipmentOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function toggleEquipment(id: number) {
        setSelectedEquipments((prev) =>
            prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
        )
    }

    function removeEquipment(id: number) {
        setSelectedEquipments((prev) => prev.filter((e) => e !== id))
    }

    async function handleSearch(e: FormEvent) {
        e.preventDefault()
        setFormError(null)
        setResults(null)
        setNoResultMessage(null)

        // Client-side validation
        if (minCapacity && (!/^\d+$/.test(minCapacity) || parseInt(minCapacity, 10) < 2)) {
            setFormError('La capacité minimum doit être un nombre entier supérieur à 1.')
            return
        }
        if ((timeStart && !timeEnd) || (!timeStart && timeEnd)) {
            setFormError("Veuillez renseigner à la fois l'heure de début et l'heure de fin.")
            return
        }
        if (timeStart && timeEnd && timeEnd <= timeStart) {
            setFormError("L'heure de fin doit être après l'heure de début.")
            return
        }

        setLoading(true)
        setSearched(true)
        try {
            const params = new URLSearchParams()
            if (minCapacity) params.set('minCapacity', minCapacity)
            if (name) params.set('name', name)
            if (date) params.set('date', date)
            if (timeStart) params.set('timeStart', timeStart)
            if (timeEnd) params.set('timeEnd', timeEnd)
            if (selectedEquipments.length > 0) {
                params.set('equipmentIds', selectedEquipments.join(','))
            }

            const res = await fetch(`/api/rooms/search?${params.toString()}`)
            let data: Record<string, any> = {}
            try { data = await res.json() } catch { /* ignore */ }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la recherche.')
            }

            setResults(data.rooms || [])
            if (data.message) setNoResultMessage(data.message)
        } catch (err: any) {
            setFormError(err.message || 'Une erreur est survenue lors de la recherche.')
        } finally {
            setLoading(false)
        }
    }

    function handleReset() {
        setMinCapacity('')
        setName('')
        setDate('')
        setTimeStart('')
        setTimeEnd('')
        setSelectedEquipments([])
        setResults(null)
        setNoResultMessage(null)
        setFormError(null)
        setSearched(false)
    }

    const selectedNames = catalog.filter((eq) => selectedEquipments.includes(eq.equipmentId))

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col">
            <Topbar />

            <div className="max-w-[1550px] w-full mx-auto px-6 md:px-8 py-10 flex-1">
                <div className="mb-8">
                    <h1 className="text-2xl font-light text-brun-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                        Recherche de salle
                    </h1>
                    <p className="text-xs text-brun-500 mt-1">
                        Tous les critères sont optionnels et combinables.
                    </p>
                    <div className="h-px bg-gradient-to-r from-brun-300 via-brun-200 to-transparent mt-5" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
                    {/* Formulaire */}
                    <div className="lg:sticky lg:top-6 bg-white border border-[#d3bd9d] rounded-lg p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
                        <form onSubmit={handleSearch} noValidate className="flex flex-col gap-5">
                            {formError && (
                                <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800 font-sans rounded-r-sm">
                                    {formError}
                                </div>
                            )}

                            {/* Section 1: Caractéristiques de la salle */}
                            <div className="flex flex-col gap-4 border-b border-brun-200 pb-5">
                                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-brun-800 font-sans">
                                    Caractéristiques de la salle
                                </span>

                                {/* Nom de la salle */}
                                <div className="flex flex-col">
                                    <label htmlFor="name" className="block text-xs text-brun-700 mb-1 font-sans font-medium">
                                        Nom de la salle
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ex : Amphi A, Salle 101..."
                                        className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre rounded-sm transition-colors focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                    />
                                </div>

                                {/* Capacité */}
                                <div className="flex flex-col">
                                    <label htmlFor="minCapacity" className="block text-xs text-brun-700 mb-1 font-sans font-medium">
                                        Capacité minimum
                                    </label>
                                    <input
                                        id="minCapacity"
                                        type="number"
                                        inputMode="numeric"
                                        min="2"
                                        step="1"
                                        value={minCapacity}
                                        onChange={(e) => {
                                            const raw = e.target.value
                                            if (raw === '' || /^\d+$/.test(raw)) {
                                                setMinCapacity(raw)
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (['-', '+', '.', ',', 'e', 'E'].includes(e.key)) {
                                                e.preventDefault()
                                            }
                                        }}
                                        onBlur={() => {
                                            if (minCapacity !== '' && parseInt(minCapacity, 10) < 2) {
                                                setMinCapacity('2')
                                            }
                                        }}
                                        placeholder="Ex : 30"
                                        className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre rounded-sm transition-colors focus:outline-none focus:border-brun-700 focus:bg-white font-sans [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                                    />
                                </div>
                                {/* Équipements — multi-select déroulant */}
                                <div className="flex flex-col" ref={equipmentRef}>
                                    <span className="block text-xs tracking-wide text-brun-700 mb-1.5 font-sans">
                                        Équipements requis
                                    </span>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setEquipmentOpen((o) => !o)}
                                            disabled={catalogLoading}
                                            aria-haspopup="listbox"
                                            aria-expanded={equipmentOpen}
                                            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-left rounded-sm transition-colors focus:outline-none focus:border-brun-700 focus:bg-white font-sans disabled:opacity-50"
                                        >
                                            <span className={selectedEquipments.length === 0 ? 'text-brun-500' : 'text-encre'}>
                                                {catalogLoading
                                                    ? 'Chargement...'
                                                    : selectedEquipments.length === 0
                                                        ? 'Sélectionner...'
                                                        : `${selectedEquipments.length} sélectionné${selectedEquipments.length > 1 ? 's' : ''}`}
                                            </span>
                                            <ChevronDown
                                                className={`w-3.5 h-3.5 text-brun-500 flex-shrink-0 transition-transform duration-150 ${equipmentOpen ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        {equipmentOpen && !catalogLoading && (
                                            <div
                                                role="listbox"
                                                className="absolute z-20 mt-1.5 w-full bg-white border border-brun-400 rounded-sm shadow-lg max-h-52 overflow-y-auto"
                                            >
                                                {catalog.length === 0 ? (
                                                    <p className="text-xs text-brun-500 font-sans italic px-3 py-3">
                                                        Aucun équipement disponible.
                                                    </p>
                                                ) : (
                                                    catalog.map((eq) => {
                                                        const checked = selectedEquipments.includes(eq.equipmentId)
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={eq.equipmentId}
                                                                role="option"
                                                                aria-selected={checked}
                                                                onClick={() => toggleEquipment(eq.equipmentId)}
                                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left font-sans transition-colors ${checked ? 'bg-brun-100 text-brun-900' : 'text-brun-800 hover:bg-brun-050'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`flex items-center justify-center w-4 h-4 border rounded-sm flex-shrink-0 ${checked
                                                                        ? 'bg-brun-800 border-brun-800'
                                                                        : 'border-brun-400 bg-white'
                                                                        }`}
                                                                >
                                                                    {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                                                </span>
                                                                {eq.name}
                                                            </button>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Chips des équipements sélectionnés */}
                                    {selectedNames.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                                            {selectedNames.map((eq) => (
                                                <span
                                                    key={eq.equipmentId}
                                                    className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-[11px] font-sans text-brun-800 bg-brun-100 border border-brun-300 rounded-full"
                                                >
                                                    {eq.name}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEquipment(eq.equipmentId)}
                                                        aria-label={`Retirer ${eq.name}`}
                                                        className="text-brun-500 hover:text-brun-900 rounded-full p-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Détails du créneau recherché */}
                            <div className="flex flex-col gap-4 border-b border-brun-200 pb-5">
                                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-brun-800 font-sans">
                                    Détails du créneau recherché
                                </span>

                                {/* Date */}
                                <div className="flex flex-col">
                                    <label htmlFor="date" className="block text-xs text-brun-700 mb-1 font-sans font-medium">
                                        Date
                                    </label>
                                    <input
                                        id="date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre rounded-sm transition-colors focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                    />
                                </div>

                                {/* Plage horaire */}
                                <div className="flex flex-col">
                                    <span className="block text-xs text-brun-700 mb-1 font-sans font-medium">
                                        Tranche horaire
                                    </span>
                                    <div className="flex gap-3">
                                        <div className="flex-1 flex flex-col">
                                            <label htmlFor="timeStart" className="block text-[10px] uppercase text-brun-500 mb-1 font-sans">
                                                De
                                            </label>
                                            <input
                                                id="timeStart"
                                                type="time"
                                                value={timeStart}
                                                onChange={(e) => setTimeStart(e.target.value)}
                                                className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre rounded-sm transition-colors focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <label htmlFor="timeEnd" className="block text-[10px] uppercase text-brun-500 mb-1 font-sans">
                                                À
                                            </label>
                                            <input
                                                id="timeEnd"
                                                type="time"
                                                value={timeEnd}
                                                onChange={(e) => setTimeEnd(e.target.value)}
                                                className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre rounded-sm transition-colors focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider border border-brun-800 rounded-sm hover:bg-brun-900 transition-colors cursor-pointer disabled:opacity-50 font-sans"
                                >
                                    {loading ? 'Recherche...' : 'Rechercher'}
                                </button>
                                {searched && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="px-3 py-2 bg-transparent text-brun-600 text-xs uppercase tracking-wider border border-brun-300 hover:bg-brun-100 transition-colors cursor-pointer rounded-sm font-medium"
                                    >
                                        Réinit.
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Résultats */}
                    <div>
                        {!searched && !loading && (
                            <div className="bg-white border border-[#d3bd9d] rounded-lg p-10 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <div className="flex justify-center mb-3">
                                    <Search className="w-10 h-10 text-brun-300" strokeWidth={1.5} />
                                </div>
                                <p className="text-sm font-medium text-brun-600 mb-1">Lancez une recherche</p>
                                <p className="text-xs text-brun-400">
                                    Utilisez le formulaire pour trouver une salle disponible.
                                </p>
                            </div>
                        )}

                        {loading && (
                            <div className="bg-white border border-[#d3bd9d] rounded-lg p-10 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <div className="w-5 h-5 border-2 border-brun-200 border-t-brun-600 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-brun-500">Recherche en cours...</p>
                            </div>
                        )}

                        {!loading && searched && results !== null && results.length === 0 && (
                            <div className="bg-white border border-[#d3bd9d] rounded-lg p-10 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <div className="flex justify-center mb-3">
                                    <Inbox className="w-10 h-10 text-brun-300" strokeWidth={1.5} />
                                </div>
                                <p className="text-sm font-medium text-brun-700 mb-1">Aucun résultat</p>
                                <p className="text-xs text-brun-500">
                                    {noResultMessage || 'Aucune salle ne correspond à vos critères.'}
                                </p>
                            </div>
                        )}

                        {!loading && results !== null && results.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <div className="text-xs uppercase tracking-wider text-brun-600 font-sans mb-1">
                                    {results.length} salle{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {results.map((room) => (
                                        <Link
                                            key={room.roomId}
                                            href={`/calendrier?roomId=${room.roomId}${date ? `&date=${date}` : ''}`}
                                            className="block bg-white border border-[#d3bd9d] rounded-lg p-5 hover:border-brun-600 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer no-underline text-encre"
                                            style={{ boxShadow: 'var(--shadow-card)' }}
                                        >
                                            <div className="flex justify-between items-start gap-3 mb-2.5">
                                                <div>
                                                    <h2 className="text-base font-normal text-brun-900 tracking-wide">
                                                        {room.name}
                                                    </h2>
                                                    <p className="flex items-center gap-1 text-xs text-brun-600 font-sans mt-1">
                                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                                        {room.location}
                                                    </p>
                                                </div>
                                                <span className="flex-shrink-0 inline-flex items-center gap-1 py-0.5 px-2.5 text-[10.5px] uppercase tracking-wider border text-brun-700 border-brun-400 bg-brun-100 font-sans">
                                                    <Users className="w-3 h-3" />
                                                    {room.capacity}
                                                </span>
                                            </div>

                                            {room.description && (
                                                <p className="text-xs text-brun-700 font-sans mb-3 leading-relaxed">
                                                    {room.description}
                                                </p>
                                            )}

                                            {room.equipments.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {room.equipments.map((eq) => (
                                                        <span
                                                            key={eq.equipmentId}
                                                            className={`inline-flex items-center gap-1 py-0.5 px-2 text-[10px] uppercase tracking-wider border  font-sans ${eq.usable
                                                                ? 'text-[#3a4a28] border-[#7c9257] bg-[#eef1e6]'
                                                                : 'text-amber-700 border-amber-300 bg-amber-50 line-through'
                                                                }`}
                                                        >
                                                            {eq.name}
                                                            {!eq.usable && ' (maintenance)'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}