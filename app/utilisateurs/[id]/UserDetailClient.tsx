'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '../../components/Topbar'
import { scheduleToast } from '../../components/ToastProvider'
import { ArrowLeft, User as UserIcon } from 'lucide-react'

type Role = {
    roleId: number
    name: string
    description: string
    maxActiveBookings: number
}

type User = {
    userId: number
    username: string
    email: string
    phone: string | null
    firstname: string
    lastname: string
    enabled: boolean
    disableReason: string | null
    role: Role
}

export default function UserDetailClient({ id }: { id: string }) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [roles, setRoles] = useState<Role[]>([])

    // States for editable fields
    const [firstname, setFirstname] = useState<string>('')
    const [lastname, setLastname] = useState<string>('')
    const [username, setUsername] = useState<string>('')
    const [email, setEmail] = useState<string>('')
    const [phone, setPhone] = useState<string>('')
    const [roleId, setRoleId] = useState<string>('')
    const [statusEnabled, setStatusEnabled] = useState<string>('true')
    const [disableReason, setDisableReason] = useState<string>('')

    const [loading, setLoading] = useState<boolean>(true)
    const [saving, setSaving] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [validationError, setValidationError] = useState<string | null>(null)

    useEffect(() => {
        const fetchUserDetail = async () => {
            try {
                const res = await fetch(`/api/users/${id}`)
                if (!res.ok) {
                    if (res.status === 404) {
                        throw new Error('Utilisateur introuvable.')
                    }
                    throw new Error('Erreur lors du chargement des données.')
                }
                const data = await res.json()
                setUser(data.user)
                setRoles(data.roles)

                if (data.user) {
                    setFirstname(data.user.firstname || '')
                    setLastname(data.user.lastname || '')
                    setUsername(data.user.username || '')
                    setEmail(data.user.email || '')
                    setPhone(data.user.phone || '')
                    setRoleId(String(data.user.role.roleId))
                    setStatusEnabled(data.user.enabled ? 'true' : 'false')
                    setDisableReason(data.user.disableReason || '')
                }
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.')
            } finally {
                setLoading(false)
            }
        }

        fetchUserDetail()
    }, [id])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setValidationError(null)
        setError(null)

        if (!firstname.trim() || !lastname.trim() || !username.trim() || !email.trim()) {
            setValidationError('Tous les champs obligatoires (*) doivent être renseignés.')
            return
        }

        const isEnabled = statusEnabled === 'true'
        if (!isEnabled && !disableReason.trim()) {
            setValidationError('Le motif de désactivation est obligatoire pour désactiver un compte.')
            return
        }

        setSaving(true)
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstname: firstname.trim(),
                    lastname: lastname.trim(),
                    username: username.trim(),
                    email: email.trim(),
                    phone: phone.trim() || null,
                    roleId: parseInt(roleId),
                    enabled: isEnabled,
                    disableReason: isEnabled ? null : disableReason.trim()
                })
            })

            let data: Record<string, any> = {}
            try {
                data = await res.json()
            } catch {
                throw new Error('Le serveur a retourné une réponse invalide.')
            }

            if (!res.ok) {
                throw new Error(data.error || 'Une erreur est survenue.')
            }

            scheduleToast({
                message: 'Utilisateur mis à jour avec succès.',
                type: 'success'
            })
            router.push('/utilisateurs')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Impossible de sauvegarder les modifications.')
        } finally {
            setSaving(false)
        }
    }

    const getFriendlyRoleName = (roleName: string) => {
        switch (roleName.toLowerCase()) {
            case 'admin':
                return 'Administrateur'
            case 'teacher':
                return 'Enseignant'
            case 'student':
                return 'Étudiant / Association'
            case 'validator':
                return 'Service Validateur'
            default:
                return roleName
        }
    }

    // Find details of the selected role (for reading max bookings)
    const selectedRoleObj = roles.find(r => String(r.roleId) === roleId)

    if (loading) {
        return (
            <div className="min-h-screen bg-brun-050 flex flex-col">
                <Topbar />
                <div className="max-w-[640px] w-full mx-auto px-8 py-10 text-center">
                    <div className="w-5 h-5 border-2 border-brun-200 border-t-brun-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-brun-500 font-sans">Chargement des détails de l&apos;utilisateur...</p>
                </div>
            </div>
        )
    }

    if (error && !user) {
        return (
            <div className="min-h-screen bg-brun-050 flex flex-col">
                <Topbar />
                <div className="max-w-[640px] w-full mx-auto px-8 py-10 text-center">
                    <p className="text-red-700 font-sans text-sm mb-4">{error}</p>
                    <Link
                        href="/utilisateurs"
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-brun-300 text-brun-700 hover:bg-brun-100 text-xs uppercase tracking-wider rounded-sm font-medium"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Retour à la liste
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col">
            <Topbar />

            <div className="max-w-[640px] w-full mx-auto px-8 py-10 flex-1">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-end justify-between">
                        <div>
                            <span className="text-xs uppercase tracking-widest text-brun-500 font-medium">Modification de compte</span>
                            <h1 className="text-2xl font-light text-brun-900 mt-1" style={{ fontFamily: 'var(--font-playfair)' }}>
                                {user?.firstname} {user?.lastname}
                            </h1>
                        </div>
                        <Link
                            href="/utilisateurs"
                            className="flex items-center gap-1.5 text-xs text-brun-700 border border-brun-300 px-3 py-1.5 hover:bg-brun-100 transition-colors rounded-sm font-medium"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Retour
                        </Link>
                    </div>
                    <div className="h-px bg-gradient-to-r from-brun-300 via-brun-200 to-transparent mt-5" />
                </div>

                <div className="bg-white border border-[#d3bd9d] p-7 rounded-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <form onSubmit={handleSave} className="flex flex-col gap-5" noValidate>
                        {error && (
                            <div role="alert" className="border-l-[3px] border-red-500 bg-red-50 px-3 py-2.5 text-xs text-red-800 rounded-sm">
                                {error}
                            </div>
                        )}
                        {validationError && (
                            <div role="alert" className="border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 rounded-sm">
                                {validationError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label htmlFor="firstname" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-semibold">
                                    Prénom *
                                </label>
                                <input
                                    id="firstname"
                                    type="text"
                                    value={firstname}
                                    onChange={(e) => setFirstname(e.target.value)}
                                    className="px-3 py-2 border border-brun-350 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
                                />
                            </div>

                            <div className="flex flex-col">
                                <label htmlFor="lastname" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-semibold">
                                    Nom *
                                </label>
                                <input
                                    id="lastname"
                                    type="text"
                                    value={lastname}
                                    onChange={(e) => setLastname(e.target.value)}
                                    className="px-3 py-2 border border-brun-350 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label htmlFor="username" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-semibold">
                                    Pseudo de connexion *
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="px-3 py-2 border border-brun-350 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
                                />
                            </div>

                            <div className="flex flex-col">
                                <label htmlFor="phone" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-semibold">
                                    Téléphone
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Non renseigné"
                                    className="px-3 py-2 border border-brun-350 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label htmlFor="email" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-semibold">
                                Adresse Email *
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="px-3 py-2 border border-brun-350 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
                            />
                        </div>

                        <div className="h-px bg-brun-200 my-1" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label htmlFor="role" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-semibold">
                                    Rôle attribué
                                </label>
                                <select
                                    id="role"
                                    value={roleId}
                                    onChange={(e) => setRoleId(e.target.value)}
                                    className="px-3 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
                                >
                                    {roles.map((role) => (
                                        <option key={role.roleId} value={role.roleId}>
                                            {getFriendlyRoleName(role.name)}
                                        </option>
                                    ))}
                                </select>
                                {selectedRoleObj && selectedRoleObj.name !== 'admin' && selectedRoleObj.name !== 'validator' && (
                                    <span className="text-[11px] text-brun-500 mt-1">
                                        Max réservations actives : <strong className="text-brun-700">{selectedRoleObj.maxActiveBookings}</strong>
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <label htmlFor="status" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-semibold">
                                    Statut du compte
                                </label>
                                <select
                                    id="status"
                                    value={statusEnabled}
                                    onChange={(e) => setStatusEnabled(e.target.value)}
                                    className="px-3 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
                                >
                                    <option value="true">Activé</option>
                                    <option value="false">Désactivé</option>
                                </select>
                            </div>
                        </div>

                        {/* Motif de désactivation */}
                        {statusEnabled === 'false' && (
                            <div className="flex flex-col">
                                <label htmlFor="disable-reason" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-semibold">
                                    Motif de désactivation *
                                </label>
                                <textarea
                                    id="disable-reason"
                                    rows={3}
                                    value={disableReason}
                                    onChange={(e) => setDisableReason(e.target.value)}
                                    placeholder="Ex : compte en attente de validation ou motif du blocage"
                                    className="px-3 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm font-sans"
                                />
                            </div>
                        )}

                        <div className="flex gap-2.5 mt-2 justify-end">
                            <Link
                                href="/utilisateurs"
                                className="px-5 py-2 border border-brun-300 text-brun-850 hover:bg-brun-100 text-xs uppercase tracking-wider transition-colors rounded-sm font-medium flex items-center justify-center"
                            >
                                Annuler
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-2 bg-brun-850 text-white hover:bg-brun-900 text-xs uppercase tracking-wider transition-colors cursor-pointer rounded-sm font-medium"
                            >
                                {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
