'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '../components/Topbar'

type Role = {
    roleId: number
    name: string
    description: string
}

type User = {
    userId: number
    username: string
    email: string
    firstname: string
    lastname: string
    enabled: boolean
    disableReason: string | null
    role: Role
}

export default function UsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [selectedRole, setSelectedRole] = useState<string>('')
    const [selectedStatus, setSelectedStatus] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    // Temp search query to update input without triggering fetch on every keystroke unless wanted.
    // However, the search should work on clicking the button or immediately.
    // The prototype says: "La recherche par nom ou email fonctionne indépendamment des filtres actifs."
    // Let's implement it so we can click "Rechercher" or submit.
    const [searchInput, setSearchInput] = useState<string>('')

    const fetchUsers = async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (selectedRole) params.append('roleId', selectedRole)
            if (selectedStatus) params.append('status', selectedStatus)
            if (searchQuery) params.append('q', searchQuery)

            const response = await fetch(`/api/users?${params.toString()}`)
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des données.')
            }
            const data = await response.json()
            setUsers(data.users || [])
            setRoles(data.roles || [])
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [selectedRole, selectedStatus, searchQuery])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setSearchQuery(searchInput)
    }

    const getUserStatusLabel = (user: User) => {
        if (user.enabled) {
            return { label: 'Activé', className: 'text-[#3a4a28] border-[#7c9257] bg-[#eef1e6]' }
        }
        if (user.disableReason) {
            return { label: 'Désactivé', className: 'text-[#6b2b20] border-[#a85c4a] bg-[#f3e6e2]' }
        }
        return { label: 'En attente', className: 'text-brun-700 border-brun-500 bg-brun-100' }
    }

    const getFriendlyRoleName = (roleName: string) => {
        switch (roleName.toLowerCase()) {
            case 'admin':
                return 'Administrateur'
            case 'teacher':
                return 'Enseignant'
            case 'student':
                return 'Étudiant / Association'
            default:
                return roleName
        }
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col">
            <Topbar />

            <div className="max-w-[1080px] w-full mx-auto px-8 py-10 flex-1">
                <div className="mb-8">
                    <h1 className="text-2xl font-light text-brun-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                        Liste des utilisateurs
                    </h1>
                    <p className="text-xs text-brun-500 mt-1">
                        Consultez, modifiez et gérez les rôles et statuts de tous les comptes.
                    </p>
                    <div className="h-px bg-gradient-to-r from-brun-300 via-brun-200 to-transparent mt-5" />
                </div>

                {/* Filtres & Recherche */}
                <div className="bg-white border border-[#d3bd9d] p-6 mb-4.5" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <label className="block text-[11px] uppercase tracking-wider text-brun-700 mb-1.5 font-sans">
                                Filtrer par rôle
                            </label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                            >
                                <option value="">Tous</option>
                                {roles.map((role) => (
                                    <option key={role.roleId} value={role.roleId}>
                                        {getFriendlyRoleName(role.name)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-[11px] uppercase tracking-wider text-brun-700 mb-1.5 font-sans">
                                Filtrer par statut
                            </label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                            >
                                <option value="">Tous</option>
                                <option value="true">Activé</option>
                                <option value="false">En attente / Désactivé</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-[11px] uppercase tracking-wider text-brun-700 mb-1.5 font-sans">
                                Rechercher (nom/email)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="ex : dupont ou marie@..."
                                    className="flex-1 px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider hover:bg-brun-900 cursor-pointer rounded-sm font-medium"
                                >
                                    Rechercher
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Table des utilisateurs */}
                <div className="bg-white border border-[#d3bd9d] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
                    {loading ? (
                        <div className="bg-white p-10 text-center">
                            <div className="w-5 h-5 border-2 border-brun-200 border-t-brun-600 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm text-brun-500">Chargement des utilisateurs...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-700 font-sans text-sm">
                            {error}
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-brun-600 font-sans text-sm">
                            Aucun utilisateur trouvé.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-[13.5px]">
                            <thead>
                                <tr className="bg-brun-050">
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Nom
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Email
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Rôle
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Statut
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => {
                                    const statusInfo = getUserStatusLabel(user)
                                    return (
                                        <tr
                                            key={user.userId}
                                            onClick={() => router.push(`/utilisateurs/${user.userId}`)}
                                            className="hover:bg-brun-100/50 cursor-pointer transition-colors duration-150"
                                        >
                                            <td className="px-3.5 py-3 border-b border-brun-200 font-medium text-brun-900">
                                                {user.firstname} {user.lastname}
                                                <span className="text-xs text-brun-500 font-normal ml-1.5">
                                                    ({user.username})
                                                </span>
                                            </td>
                                            <td className="px-3.5 py-3 border-b border-brun-200 text-brun-800">
                                                {user.email}
                                            </td>
                                            <td className="px-3.5 py-3 border-b border-brun-200 text-brun-800">
                                                {getFriendlyRoleName(user.role.name)}
                                            </td>
                                            <td className="px-3.5 py-3 border-b border-brun-200">
                                                <span className={`inline-block py-0.5 px-2.5 text-[10.5px] uppercase tracking-wider border rounded-none font-semibold ${statusInfo.className}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
