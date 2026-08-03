'use client'

import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar'
import {
    Users,
    School,
    ClipboardList,
    Scroll,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    Calendar,
    ArrowUpRight
} from 'lucide-react'

type UserRole = 'admin' | 'teacher' | 'student' | 'validator' | null

type DashboardData = {
    role: UserRole
    stats: Record<string, number>
    chartData: { name: string; count: number }[]
}

const ROLE_LABEL: Record<string, string> = {
    admin: 'Administrateur',
    teacher: 'Enseignant',
    student: 'Étudiant',
    validator: 'Service Validateur',
}

export default function AccueilPage() {
    const [role, setRole] = useState<UserRole>(null)
    const [firstname, setFirstname] = useState<string | null>(null)
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Fetch identity
        fetch('/api/auth/me')
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data?.roleName) setRole(data.roleName as UserRole)
                if (data?.username) setFirstname(data.username)
            })
            .catch(() => { })

        // Fetch stats
        fetch('/api/dashboard/stats')
            .then((r) => {
                if (!r.ok) throw new Error('Impossible de charger les statistiques.')
                return r.json()
            })
            .then((res) => {
                setData(res)
                setLoading(false)
            })
            .catch((err) => {
                setError(err.message)
                setLoading(false)
            })
    }, [])

    // Rendu des chiffres clés à droite en fonction du rôle
    const renderRightStats = () => {
        if (!data) return null

        if (role === 'admin') {
            const statsItems = [
                { label: 'Utilisateurs enregistrés', value: data.stats.totalUsers, icon: Users, desc: 'Comptes actifs' },
                { label: 'Salles configurées', value: data.stats.totalRooms, icon: School, desc: 'Salles réservables' },
                { label: 'Réservations totales', value: data.stats.totalBookings, icon: ClipboardList, desc: 'Historique cumulé' },
                { label: 'Logs système enregistrés', value: data.stats.totalLogs, icon: Scroll, desc: 'Actions tracées' },
            ]

            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statsItems.map((item, idx) => {
                        const Icon = item.icon
                        return (
                            <div key={idx} className="bg-white border border-brun-200 p-5 rounded-sm flex flex-col justify-between" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <div className="flex justify-between items-start">
                                    <span className="text-[11px] uppercase tracking-wider text-brun-500 font-medium">{item.label}</span>
                                    <Icon className="w-4 h-4 text-brun-600" />
                                </div>
                                <div className="mt-4">
                                    <span className="text-3xl font-light text-brun-900 tracking-tight">{item.value}</span>
                                    <p className="text-[10px] text-brun-400 mt-1">{item.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        if (role === 'teacher') {
            const statsItems = [
                { label: 'Total réservations', value: data.stats.totalBookings, icon: ClipboardList, desc: 'Créneaux réservés' },
                { label: 'Réservations validées', value: data.stats.confirmedBookings, icon: CheckCircle2, desc: 'Prêtes pour vos cours' },
                { label: 'Demandes en attente', value: data.stats.pendingBookings, icon: Clock, desc: 'En attente de traitement' },
                { label: 'Refusées ou Annulées', value: data.stats.otherBookings, icon: XCircle, desc: 'Indisponibles / annulées' },
            ]

            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statsItems.map((item, idx) => {
                        const Icon = item.icon
                        return (
                            <div key={idx} className="bg-white border border-brun-200 p-5 rounded-sm flex flex-col justify-between" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <div className="flex justify-between items-start">
                                    <span className="text-[11px] uppercase tracking-wider text-brun-500 font-medium">{item.label}</span>
                                    <Icon className="w-4 h-4 text-brun-600" />
                                </div>
                                <div className="mt-4">
                                    <span className="text-3xl font-light text-brun-900 tracking-tight">{item.value}</span>
                                    <p className="text-[10px] text-brun-400 mt-1">{item.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        if (role === 'student') {
            const statsItems = [
                { label: 'Mes demandes', value: data.stats.totalBookings, icon: ClipboardList, desc: 'Total soumis' },
                { label: 'Demandes acceptées', value: data.stats.confirmedBookings, icon: CheckCircle2, desc: 'Réservations validées' },
                { label: 'En attente de validation', value: data.stats.pendingBookings, icon: Clock, desc: 'Traitement logistique' },
                { label: 'Demandes refusées', value: data.stats.refusedBookings, icon: AlertCircle, desc: 'Créneaux indisponibles' },
            ]

            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statsItems.map((item, idx) => {
                        const Icon = item.icon
                        return (
                            <div key={idx} className="bg-white border border-brun-200 p-5 rounded-sm flex flex-col justify-between" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <div className="flex justify-between items-start">
                                    <span className="text-[11px] uppercase tracking-wider text-brun-500 font-medium">{item.label}</span>
                                    <Icon className="w-4 h-4 text-brun-600" />
                                </div>
                                <div className="mt-4">
                                    <span className="text-3xl font-light text-brun-900 tracking-tight">{item.value}</span>
                                    <p className="text-[10px] text-brun-400 mt-1">{item.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        if (role === 'validator') {
            const statsItems = [
                { label: 'Demandes en attente', value: data.stats.pendingBookings, icon: Clock, desc: 'À traiter urgemment' },
                { label: 'Demandes traitées', value: data.stats.processedBookings, icon: CheckCircle2, desc: 'Total validées/refusées' },
                { label: 'Salles surveillées', value: data.stats.totalRooms, icon: School, desc: 'Total des locaux' },
            ]

            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statsItems.map((item, idx) => {
                        const Icon = item.icon
                        return (
                            <div key={idx} className="bg-white border border-brun-200 p-5 rounded-sm flex flex-col justify-between" style={{ boxShadow: 'var(--shadow-card)' }}>
                                <div className="flex justify-between items-start">
                                    <span className="text-[11px] uppercase tracking-wider text-brun-500 font-medium">{item.label}</span>
                                    <Icon className="w-4 h-4 text-brun-600" />
                                </div>
                                <div className="mt-4">
                                    <span className="text-3xl font-light text-brun-900 tracking-tight">{item.value}</span>
                                    <p className="text-[10px] text-brun-400 mt-1">{item.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        return null
    }

    // Rendu du graphique à gauche en fonction du rôle (SVG)
    const renderLeftChart = () => {
        if (!data || data.chartData.length === 0) {
            return (
                <div className="h-full min-h-[300px] bg-white border border-brun-200 rounded-sm flex flex-col items-center justify-center text-center p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <Calendar className="w-8 h-8 text-brun-300 mb-2" />
                    <p className="text-xs text-brun-500">Aucune donnée disponible pour le graphique.</p>
                </div>
            )
        }

        const maxVal = Math.max(...data.chartData.map(d => d.count), 1)

        // 1. ADMIN - Bar Chart (Top 5 Salles)
        if (role === 'admin') {
            return (
                <div className="bg-white border border-brun-200 p-6 rounded-sm flex flex-col justify-between h-full min-h-[320px]" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-brun-700 font-semibold mb-1">Top 5 des salles les plus réservées</h3>
                        <p className="text-[11px] text-brun-400 mb-5">Nombre total de créneaux réservés par salle</p>
                    </div>

                    <div className="flex flex-col gap-4.5">
                        {data.chartData.map((item, idx) => {
                            const percent = (item.count / maxVal) * 100
                            return (
                                <div key={idx} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between text-xs font-medium text-brun-850">
                                        <span>{item.name}</span>
                                        <span className="text-brun-600">{item.count} rés.</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-brun-100/60 rounded-none overflow-hidden">
                                        <div
                                            className="h-full bg-brun-600 rounded-none"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        // 2. TEACHER - Area Chart / Weekly Line Graph (SVG)
        if (role === 'teacher') {
            const height = 180
            const width = 450
            const padding = 35

            // Construire les coordonnées des points pour le tracé SVG
            const points = data.chartData.map((d, i) => {
                const x = padding + (i * (width - padding * 2)) / (data.chartData.length - 1)
                const y = height - padding - (d.count / maxVal) * (height - padding * 2)
                return { x, y }
            })

            const pathD = points.length > 0
                ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
                : ''

            const areaD = points.length > 0
                ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
                : ''

            return (
                <div className="bg-white border border-brun-200 p-6 rounded-sm flex flex-col justify-between h-full min-h-[320px]" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-brun-700 font-semibold mb-1">Mes réservations hebdomadaires</h3>
                        <p className="text-[11px] text-brun-400 mb-5">Nombre de créneaux réservés par jour de la semaine</p>
                    </div>

                    <div className="relative w-full overflow-x-auto">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]">
                            {/* Grille horizontale */}
                            {[0, 0.5, 1].map((ratio, idx) => {
                                const y = padding + ratio * (height - padding * 2)
                                return (
                                    <line
                                        key={idx}
                                        x1={padding}
                                        y1={y}
                                        x2={width - padding}
                                        y2={y}
                                        stroke="#ead9c0"
                                        strokeWidth={1}
                                        strokeDasharray="4 4"
                                    />
                                )
                            })}

                            {/* Remplissage de l'aire sous la courbe */}
                            {areaD && (
                                <path
                                    d={areaD}
                                    fill="rgba(138, 98, 64, 0.08)"
                                />
                            )}

                            {/* Ligne courbe */}
                            {pathD && (
                                <path
                                    d={pathD}
                                    fill="none"
                                    stroke="var(--color-brun-600)"
                                    strokeWidth={2}
                                />
                            )}

                            {/* Points sur la courbe */}
                            {points.map((p, idx) => (
                                <circle
                                    key={idx}
                                    cx={p.x}
                                    cy={p.y}
                                    r={4}
                                    fill="var(--color-brun-900)"
                                    stroke="#fff"
                                    strokeWidth={1.5}
                                />
                            ))}

                            {/* Libellés des jours */}
                            {data.chartData.map((d, i) => {
                                const x = padding + (i * (width - padding * 2)) / (data.chartData.length - 1)
                                return (
                                    <text
                                        key={i}
                                        x={x}
                                        y={height - 10}
                                        fontSize={9}
                                        fill="var(--color-brun-500)"
                                        textAnchor="middle"
                                        className="font-sans"
                                    >
                                        {d.name.substring(0, 3)}
                                    </text>
                                )
                            })}
                        </svg>
                    </div>
                </div>
            )
        }

        // 3. STUDENT - Semi-donut ou progress bars par statut
        if (role === 'student') {
            const statusColors: Record<string, string> = {
                'Confirmées': 'bg-emerald-600',
                'En attente': 'bg-amber-500',
                'Refusées': 'bg-red-500',
                'Annulées': 'bg-gray-400',
            }

            const total = data.chartData.reduce((acc, curr) => acc + curr.count, 0)

            return (
                <div className="bg-white border border-brun-200 p-6 rounded-sm flex flex-col justify-between h-full min-h-[320px]" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-brun-700 font-semibold mb-1">Répartition par statut</h3>
                        <p className="text-[11px] text-brun-400 mb-5">Statut de validation de mes demandes</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {data.chartData.map((item, idx) => {
                            const percent = total > 0 ? (item.count / total) * 100 : 0
                            const colorClass = statusColors[item.name] || 'bg-brun-600'
                            return (
                                <div key={idx} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-medium text-brun-850">{item.name}</span>
                                        <span className="text-brun-500 font-medium">
                                            {item.count} ({Math.round(percent)}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-brun-100/60 rounded-none overflow-hidden">
                                        <div
                                            className={`h-full rounded-none ${colorClass}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        // 4. VALIDATOR - Column chart
        if (role === 'validator') {
            return (
                <div className="bg-white border border-brun-200 p-6 rounded-sm flex flex-col justify-between h-full min-h-[320px]" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-brun-700 font-semibold mb-1">Flux des nouvelles demandes</h3>
                        <p className="text-[11px] text-brun-400 mb-5">Demandes soumises au cours des 7 derniers jours</p>
                    </div>

                    <div className="flex items-end justify-between h-40 gap-3 px-2 pt-4">
                        {data.chartData.map((item, idx) => {
                            const percent = maxVal > 0 ? (item.count / maxVal) * 100 : 0
                            return (
                                <div key={idx} className="flex flex-col items-center flex-1 gap-2 h-full justify-end">
                                    <span className="text-[9px] font-semibold text-brun-600">{item.count}</span>
                                    <div className="w-full bg-brun-100 rounded-t-sm overflow-hidden flex items-end h-full">
                                        <div
                                            className="w-full bg-brun-600 rounded-t-sm hover:bg-brun-700 transition-colors"
                                            style={{ height: `${Math.max(percent, 6)}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-brun-500 whitespace-nowrap">{item.name}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        return null
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col">
            <Topbar />

            <div className="max-w-[1040px] w-full mx-auto px-8 py-10 flex-1">
                {/* Header */}
                <div className="mb-9">
                    <div className="flex items-end justify-between">
                        <div>
                            {firstname && role ? (
                                <p className="text-xs uppercase tracking-widest text-brun-500 mb-1 font-medium">
                                    Bonjour, <span className="text-brun-700 font-semibold">{firstname}</span> · {ROLE_LABEL[role]}
                                </p>
                            ) : (
                                <p className="text-xs uppercase tracking-widest text-brun-400 mb-1">&nbsp;</p>
                            )}
                            <h1 className="text-2xl font-light text-brun-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                                Tableau de bord
                            </h1>
                            <p className="text-sm text-brun-600 mt-1">
                                {role === 'validator'
                                    ? 'Suivez le statut de validation global et gérez les demandes des étudiants.'
                                    : 'Accédez au suivi des salles et gérez vos réservations en temps réel.'
                                }
                            </p>
                        </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-brun-300 via-brun-200 to-transparent mt-5" />
                </div>

                {loading ? (
                    <div className="bg-white border border-[#d3bd9d] p-12 text-center rounded-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
                        <div className="w-5 h-5 border-2 border-brun-200 border-t-brun-600 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-brun-500">Chargement de votre tableau de bord...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 p-8 text-center text-red-700 text-sm rounded-sm">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Côté gauche: Représentation graphique */}
                        <div className="lg:col-span-7">
                            {renderLeftChart()}
                        </div>

                        {/* Côté droit: Chiffres clés */}
                        <div className="lg:col-span-5 flex flex-col justify-between">
                            {renderRightStats()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
