'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '../components/Topbar'
import { scheduleToast } from '../components/ToastProvider'
import { ArrowLeft, User as UserIcon, Shield, CalendarCheck } from 'lucide-react'

type Role = {
    name: string
    description: string
    maxActiveBookings: number
}

type UserProfile = {
    userId: number
    username: string
    email: string
    phone: string | null
    firstname: string
    lastname: string
    role: Role
}

export default function ProfilePage() {
    const router = useRouter()
    const [profile, setProfile] = useState<UserProfile | null>(null)

    // States for editable fields
    const [firstname, setFirstname] = useState<string>('')
    const [lastname, setLastname] = useState<string>('')
    const [username, setUsername] = useState<string>('')
    const [email, setEmail] = useState<string>('')
    const [phone, setPhone] = useState<string>('')

    const [loading, setLoading] = useState<boolean>(true)
    const [saving, setSaving] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [validationError, setValidationError] = useState<string | null>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/profile')
                if (!res.ok) {
                    throw new Error('Erreur lors du chargement du profil.')
                }
                const data = await res.json()
                setProfile(data.user)

                if (data.user) {
                    setFirstname(data.user.firstname || '')
                    setLastname(data.user.lastname || '')
                    setUsername(data.user.username || '')
                    setEmail(data.user.email || '')
                    setPhone(data.user.phone || '')
                }
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.')
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setValidationError(null)
        setError(null)

        if (!firstname.trim() || !lastname.trim() || !username.trim() || !email.trim()) {
            setValidationError('Tous les champs obligatoires (*) doivent être renseignés.')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstname: firstname.trim(),
                    lastname: lastname.trim(),
                    username: username.trim(),
                    email: email.trim(),
                    phone: phone.trim() || null
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

            // Mettre à jour l'identité en cache locale
            try {
                const roleName = profile?.role.name || ''
                sessionStorage.setItem('rb_auth', JSON.stringify({ role: roleName, username: username.trim() }))
            } catch { /* ignore */ }

            scheduleToast({
                message: 'Profil mis à jour avec succès.',
                type: 'success'
            })
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

    if (loading) {
        return (
            <div className="min-h-screen bg-brun-050 flex flex-col">
                <Topbar />
                <div className="max-w-[640px] w-full mx-auto px-8 py-10 text-center">
                    <div className="w-5 h-5 border-2 border-brun-200 border-t-brun-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-brun-500">Chargement de votre profil...</p>
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
                            <span className="text-xs uppercase tracking-widest text-brun-500 font-medium">Mon compte</span>
                            <h1 className="text-2xl font-light text-brun-900 mt-1" style={{ fontFamily: 'var(--font-playfair)' }}>
                                Profil Utilisateur
                            </h1>
                        </div>
                        <Link
                            href="/accueil"
                            className="flex items-center gap-1.5 text-xs text-brun-700 border border-brun-300 px-3 py-1.5 hover:bg-brun-100 transition-colors rounded-sm font-medium"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Retour
                        </Link>
                    </div>
                    <div className="h-px bg-gradient-to-r from-brun-300 via-brun-200 to-transparent mt-5" />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Infos Rôle & Booking Limit (Read-Only) */}
                    {profile && (
                        <div className="bg-white border border-[#d3bd9d] p-5 rounded-sm flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-brun-100 flex items-center justify-center rounded-sm text-brun-700">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-brun-500 font-medium uppercase tracking-wider">Rôle attribué</p>
                                    <h4 className="text-sm font-bold text-brun-900">{getFriendlyRoleName(profile.role.name)}</h4>
                                </div>
                            </div>
                            {profile.role.name !== 'admin' && profile.role.name !== 'validator' && (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brun-100 flex items-center justify-center rounded-sm text-brun-700">
                                        <CalendarCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-brun-500 font-medium uppercase tracking-wider">Limite de réservations</p>
                                        <h4 className="text-sm font-bold text-brun-900">
                                            {profile.role.maxActiveBookings === 99 ? 'Illimitée' : `${profile.role.maxActiveBookings} réservations`}
                                        </h4>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Formulaire de modification */}
                    <div className="bg-white border border-[#d3bd9d] p-7 rounded-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
                        <form onSubmit={handleSave} className="flex flex-col gap-5" noValidate>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-brun-800 border-b border-brun-100 pb-2">Informations personnelles</h3>

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
                                        className="px-3 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
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
                                        className="px-3 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
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
                                        className="px-3 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
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
                                        className="px-3 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
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
                                    className="px-3 py-2 border border-brun-300 bg-brun-050 text-sm text-encre focus:outline-none rounded-sm"
                                />
                            </div>

                            <div className="flex gap-2.5 mt-2 justify-end">
                                <Link
                                    href="/accueil"
                                    className="px-5 py-2 border border-brun-300 text-brun-850 hover:bg-brun-100 text-xs uppercase tracking-wider transition-colors rounded-sm font-medium flex items-center justify-center"
                                >
                                    Annuler
                                </Link>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-brun-850 text-white hover:bg-brun-900 text-xs uppercase tracking-wider transition-colors cursor-pointer rounded-sm font-medium"
                                >
                                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
