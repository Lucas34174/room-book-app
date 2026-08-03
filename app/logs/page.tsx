'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '../components/Topbar'
import { Inbox } from 'lucide-react'

type LogEntry = {
    logId: number
    actionName: string
    actionDescription: string
    userId: number
    username: string
    name: string
    details: string
    createdAt: string
}

type FilterOption = {
    actionId: string
    userId: string
    startDate: string
    endDate: string
}

type ActionOption = {
    actionId: number
    name: string
    description: string
}

type UserOption = {
    userId: number
    username: string
    firstname: string
    lastname: string
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [actionOptions, setActionOptions] = useState<ActionOption[]>([])
    const [userOptions, setUserOptions] = useState<UserOption[]>([])

    const [filters, setFilters] = useState<FilterOption>({
        actionId: '',
        userId: '',
        startDate: '',
        endDate: ''
    })

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLogs = async () => {
        setLoading(true)
        setError(null)
        try {
            const queryParams = new URLSearchParams()
            if (filters.actionId) queryParams.set('actionId', filters.actionId)
            if (filters.userId) queryParams.set('userId', filters.userId)
            if (filters.startDate) queryParams.set('startDate', filters.startDate)
            if (filters.endDate) queryParams.set('endDate', filters.endDate)

            const res = await fetch(`/api/logs?${queryParams.toString()}`)
            if (!res.ok) throw new Error('Impossible de charger les journaux d\'activités.')
            const data = await res.json()
            setLogs(data.logs || [])
            setActionOptions(data.filters?.actions || [])
            setUserOptions(data.filters?.users || [])
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [filters.actionId, filters.userId, filters.startDate, filters.endDate])

    function handleResetFilters() {
        setFilters({
            actionId: '',
            userId: '',
            startDate: '',
            endDate: ''
        })
    }

    const actionLabels: Record<string, string> = {
        RESERVATION_CREEE: 'Soumission demande',
        RESERVATION_CONFIRMEE: 'Réservation directe',
        RESERVATION_VALIDEE: 'Demande validée',
        RESERVATION_REFUSEE: 'Demande refusée',
        RESERVATION_ANNULEE: 'Réservation annulée',
        RESERVATION_PRIORITAIRE: 'Conflit prioritaire',
        COMPTE_ACTIVE: 'Compte activé',
        COMPTE_DESACTIVE: 'Compte désactivé',
        COMPTE_ROLE_MODIFIE: 'Rôle modifié'
    }

    const actionBadgeColors: Record<string, string> = {
        RESERVATION_CREEE: 'text-amber-800 border-amber-300 bg-amber-50',
        RESERVATION_CONFIRMEE: 'text-emerald-800 border-emerald-300 bg-emerald-50',
        RESERVATION_VALIDEE: 'text-emerald-800 border-emerald-300 bg-emerald-50',
        RESERVATION_REFUSEE: 'text-red-800 border-red-300 bg-red-50',
        RESERVATION_ANNULEE: 'text-gray-800 border-gray-300 bg-gray-50',
        RESERVATION_PRIORITAIRE: 'text-purple-800 border-purple-300 bg-purple-50',
        COMPTE_ACTIVE: 'text-blue-800 border-blue-300 bg-blue-50',
        COMPTE_DESACTIVE: 'text-zinc-800 border-zinc-300 bg-zinc-50',
        COMPTE_ROLE_MODIFIE: 'text-indigo-800 border-indigo-300 bg-indigo-50'
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col">
            <Topbar />

            <div className="max-w-[1040px] w-full mx-auto px-8 py-10 flex-1">
                <div className="mb-8">
                    <h1 className="text-2xl font-light text-brun-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                        Historique des actions
                    </h1>
                    <p className="text-xs text-brun-500 mt-1">
                        Traçabilité complète des réservations, validations, annulations et modifications système.
                    </p>
                    <div className="h-px bg-gradient-to-r from-brun-300 via-brun-200 to-transparent mt-5" />
                </div>

                {/* Filtres de recherche */}
                <div className="bg-white border border-[#d3bd9d] p-5 mb-7 font-sans text-xs">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xs uppercase tracking-wide text-brun-750 font-semibold">
                            Filtres de recherche
                        </h2>
                        {(filters.actionId || filters.userId || filters.startDate || filters.endDate) && (
                            <button
                                onClick={handleResetFilters}
                                className="text-[10px] text-brun-600 hover:text-brun-900 underline uppercase tracking-wider cursor-pointer font-bold"
                            >
                                Réinitialiser
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Type d'action */}
                        <div>
                            <label htmlFor="actionFilter" className="block text-brun-800 mb-1.5 font-semibold">Type d&apos;action</label>
                            <select
                                id="actionFilter"
                                value={filters.actionId}
                                onChange={(e) => setFilters(prev => ({ ...prev, actionId: e.target.value }))}
                                className="w-full px-2 py-1.5 border border-brun-300 bg-brun-050 text-[11.5px] text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                            >
                                <option value="">Toutes les actions</option>
                                {actionOptions.map(act => (
                                    <option key={act.actionId} value={act.actionId}>
                                        {actionLabels[act.name] || act.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Utilisateur */}
                        <div>
                            <label htmlFor="userFilter" className="block text-brun-800 mb-1.5 font-semibold">Auteur de l&apos;action</label>
                            <select
                                id="userFilter"
                                value={filters.userId}
                                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                                className="w-full px-2 py-1.5 border border-brun-300 bg-brun-050 text-[11.5px] text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                            >
                                <option value="">Tous les utilisateurs</option>
                                {userOptions.map(usr => (
                                    <option key={usr.userId} value={usr.userId}>
                                        {usr.firstname} {usr.lastname} (@{usr.username})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date début */}
                        <div>
                            <label htmlFor="startFilter" className="block text-brun-800 mb-1.5 font-semibold">Date de début</label>
                            <input
                                type="date"
                                id="startFilter"
                                value={filters.startDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full px-2 py-1 border border-brun-300 bg-brun-050 text-[11.5px] text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                            />
                        </div>

                        {/* Date fin */}
                        <div>
                            <label htmlFor="endFilter" className="block text-brun-800 mb-1.5 font-semibold">Date de fin</label>
                            <input
                                type="date"
                                id="endFilter"
                                value={filters.endDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full px-2 py-1 border border-brun-300 bg-brun-050 text-[11.5px] text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white border border-[#d3bd9d] p-10 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                        <div className="w-5 h-5 border-2 border-brun-200 border-t-brun-600 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-brun-500">Chargement des activités...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 p-8 text-center text-red-700 text-sm rounded-sm">
                        {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="bg-white border border-[#d3bd9d] p-10 text-center">
                        <div className="flex justify-center mb-3">
                            <Inbox className="w-10 h-10 text-brun-400" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm text-brun-700 font-sans font-semibold mb-1">
                            Aucune activité trouvée
                        </p>
                        <p className="text-xs text-brun-500 font-sans">
                            Ajustez vos critères de filtrage pour étendre la recherche.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white border border-[#d3bd9d] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left font-sans text-xs">
                                <thead>
                                    <tr className="bg-brun-900 text-brun-100 uppercase tracking-wider text-[10px] border-b-[3px] border-brun-500">
                                        <th className="p-4 font-semibold font-serif">Date & Heure</th>
                                        <th className="p-4 font-semibold font-serif">Action</th>
                                        <th className="p-4 font-semibold font-serif">Auteur</th>
                                        <th className="p-4 font-semibold font-serif">Détails</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brun-100">
                                    {logs.map((l) => {
                                        const dateStr = new Date(l.createdAt).toLocaleDateString('fr-FR', {
                                            day: 'numeric', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                                        })

                                        return (
                                            <tr key={l.logId} className="hover:bg-brun-050/40 transition-colors">
                                                <td className="p-4 whitespace-nowrap text-brun-600 font-mono text-[11px]">{dateStr}</td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className={`inline-block border px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-sm font-semibold ${actionBadgeColors[l.actionName] || 'text-gray-800 border-gray-300 bg-gray-50'}`}>
                                                        {actionLabels[l.actionName] || l.actionName}
                                                    </span>
                                                </td>
                                                <td className="p-4 whitespace-nowrap font-medium text-brun-900">
                                                    {l.name} <span className="text-brun-400 font-normal">(@{l.username})</span>
                                                </td>
                                                <td className="p-4 text-brun-700 leading-relaxed min-w-[250px]">{l.details}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
