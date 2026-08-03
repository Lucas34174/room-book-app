'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '../components/Topbar'
import { BarChart3, Download } from 'lucide-react'

type RoomStat = {
    roomId: number
    roomName: string
    location: string
    capacity: number
    totalAvailableSlots: number
    bookingsCount: number
    occupancyRate: number
}

type PopularPeriod = {
    roomName: string
    dayOfWeek: number
    timeStart: string
    timeEnd: string
    count: number
}

const DAY_LABELS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function StatsPage() {
    const [roomStats, setRoomStats] = useState<RoomStat[]>([])
    const [popularPeriods, setPopularPeriods] = useState<PopularPeriod[]>([])
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Initialiser les dates par défaut (30 derniers jours)
    useEffect(() => {
        const today = new Date()
        const past30Days = new Date()
        past30Days.setDate(today.getDate() - 30)

        setEndDate(today.toISOString().split('T')[0])
        setStartDate(past30Days.toISOString().split('T')[0])
    }, [])

    const fetchStats = async () => {
        if (!startDate || !endDate) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/stats?startDate=${startDate}&endDate=${endDate}`)
            if (!res.ok) throw new Error('Impossible de charger les statistiques.')
            const data = await res.json()
            setRoomStats(data.roomStats || [])
            setPopularPeriods(data.popularPeriods || [])
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [startDate, endDate])

    // Calcul de statistiques globales
    const totalBookings = roomStats.reduce((sum, item) => sum + item.bookingsCount, 0)
    const avgOccupancy = roomStats.length > 0 
        ? Math.round(roomStats.reduce((sum, item) => sum + item.occupancyRate, 0) / roomStats.length)
        : 0

    // Export au format CSV
    function handleExportCSV() {
        const headers = ['Salle', 'Localisation', 'Capacite', 'Slots Disponibles', 'Reservations Effectuees', 'Taux Occupation (%)']
        const rows = roomStats.map(r => [
            r.roomName,
            r.location,
            r.capacity,
            r.totalAvailableSlots,
            r.bookingsCount,
            `${r.occupancyRate}%`
        ])

        // Ajouter les créneaux les plus demandés au fichier CSV
        const csvContent = [
            `Rapport de statistiques du ${startDate} au ${endDate}`,
            '',
            '--- OCCUPATION DES SALLES ---',
            headers.join(','),
            ...rows.map(row => row.map(val => `"${val}"`).join(',')),
            '',
            '--- CRENEAUX LES PLUS DEMANDES ---',
            ['Salle', 'Jour', 'Heure Debut', 'Heure Fin', 'Nombre de Reservations'].join(','),
            ...popularPeriods.map(p => [
                p.roomName,
                DAY_LABELS[p.dayOfWeek] || p.dayOfWeek,
                p.timeStart,
                p.timeEnd,
                p.count
            ].map(val => `"${val}"`).join(','))
        ].join('\n')

        // Téléchargement du fichier
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `roombook_statistiques_${startDate}_to_${endDate}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col">
            <Topbar />

            <div className="max-w-[1040px] w-full mx-auto px-8 py-10 flex-1">
                <div className="mb-8">
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-2xl font-light text-brun-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                                Statistiques d&apos;utilisation
                            </h1>
                            <p className="text-xs text-brun-500 mt-1">
                                Visualisation de l&apos;usage des salles et des créneaux horaires.
                            </p>
                        </div>

                        <button
                            onClick={handleExportCSV}
                            disabled={loading || roomStats.length === 0}
                            className="flex items-center gap-1.5 px-4 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider hover:bg-brun-900 transition-colors cursor-pointer disabled:opacity-40 rounded-sm font-medium self-start"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Exporter CSV
                        </button>
                    </div>
                    <div className="h-px bg-gradient-to-r from-brun-300 via-brun-200 to-transparent mt-5" />
                </div>

                {/* Filtres de date */}
                <div className="bg-white border border-[#d3bd9d] p-5 mb-7">
                    <h2 className="text-xs uppercase tracking-wide text-brun-700 font-semibold mb-4 font-sans">
                        Période d&apos;analyse
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                        <div>
                            <label htmlFor="startDate" className="block text-brun-800 mb-1.5 font-semibold">Date de début</label>
                            <input
                                type="date"
                                id="startDate"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-2.5 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-brun-800 mb-1.5 font-semibold">Date de fin</label>
                            <input
                                type="date"
                                id="endDate"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-2.5 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white border border-[#d3bd9d] p-10 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                        <div className="w-5 h-5 border-2 border-brun-200 border-t-brun-600 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-brun-500">Chargement des statistiques...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 p-8 text-center text-red-700 text-sm rounded-sm">
                        {error}
                    </div>
                ) : roomStats.length === 0 ? (
                    <div className="bg-white border border-[#d3bd9d] p-10 text-center">
                        <div className="flex justify-center mb-3">
                            <BarChart3 className="w-10 h-10 text-brun-400" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm text-brun-700 font-sans font-semibold mb-1">
                            Aucune donnée disponible
                        </p>
                        <p className="text-xs text-brun-500 font-sans">
                            Aucune réservation confirmée sur la période sélectionnée.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
                        {/* Statistiques clés & Taux d'occupation */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white border border-[#d3bd9d] p-5">
                                    <p className="text-[10px] uppercase tracking-wider text-brun-500 font-sans font-semibold">Réservations validées</p>
                                    <p className="text-3xl font-light text-brun-900 mt-1">{totalBookings}</p>
                                </div>
                                <div className="bg-white border border-[#d3bd9d] p-5">
                                    <p className="text-[10px] uppercase tracking-wider text-brun-500 font-sans font-semibold">Taux d&apos;occupation moyen</p>
                                    <p className="text-3xl font-light text-brun-900 mt-1">{avgOccupancy}%</p>
                                </div>
                            </div>

                            {/* Taux d'occupation par salle */}
                            <div className="bg-white border border-[#d3bd9d] p-6">
                                <h3 className="text-xs uppercase tracking-wide text-brun-850 font-semibold mb-4 font-sans">
                                    Occupation par salle
                                </h3>
                                <div className="flex flex-col gap-4 font-sans text-xs">
                                    {roomStats.map(room => (
                                        <div key={room.roomId} className="border-b border-brun-100 pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-semibold text-brun-900 text-sm">{room.roomName}</span>
                                                <span className="text-brun-600">{room.bookingsCount} rés. / {room.occupancyRate}%</span>
                                            </div>
                                            <div className="text-[10px] text-brun-500 mb-2">{room.location} · Capacité : {room.capacity} places</div>
                                            <div className="w-full bg-brun-100 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-brun-700 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${Math.min(room.occupancyRate, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Créneaux les plus demandés */}
                        <div className="bg-white border border-[#d3bd9d] p-6 self-start">
                            <h3 className="text-xs uppercase tracking-wide text-brun-850 font-semibold mb-4 font-sans">
                                Créneaux populaires
                            </h3>
                            {popularPeriods.length === 0 ? (
                                <p className="text-xs text-brun-500 font-sans italic">Aucun créneau demandé.</p>
                            ) : (
                                <div className="flex flex-col gap-3 font-sans text-xs">
                                    {popularPeriods.map((p, idx) => (
                                        <div key={idx} className="flex items-start gap-3 border-b border-brun-100 pb-2.5 last:border-0 last:pb-0">
                                            <span className="bg-brun-100 text-brun-800 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                                {idx + 1}
                                            </span>
                                            <div className="flex-1">
                                                <p className="font-semibold text-brun-900">{p.roomName}</p>
                                                <p className="text-[10px] text-brun-500 mt-0.5">
                                                    {DAY_LABELS[p.dayOfWeek]} · {p.timeStart.replace(':', 'h')} - {p.timeEnd.replace(':', 'h')}
                                                </p>
                                            </div>
                                            <span className="text-[10px] bg-brun-050 border border-brun-200 px-2 py-0.5 text-brun-700 whitespace-nowrap">
                                                {p.count} rés.
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
