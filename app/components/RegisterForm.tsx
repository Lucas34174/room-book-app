'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { scheduleToast } from './ToastProvider'

type FieldErrors = Partial<Record<
    'firstname' | 'lastname' | 'email' | 'username' | 'password' | 'confirmPassword' | 'roleId' | 'phone',
    string
>>

export default function RegisterForm() {
    const router = useRouter()
    const [firstname, setFirstname] = useState('')
    const [lastname, setLastname] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [roleId, setRoleId] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [apiError, setApiError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    function validateFields(): boolean {
        const errors: FieldErrors = {}
        if (!firstname.trim()) errors.firstname = 'Ce champ est obligatoire.'
        if (!lastname.trim()) errors.lastname = 'Ce champ est obligatoire.'
        if (!email.trim()) {
            errors.email = 'Ce champ est obligatoire.'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Adresse email invalide.'
        }
        
        // Validation basique du téléphone (optionnel)
        if (phone.trim() && !/^\+?[0-9\s-]{8,15}$/.test(phone.trim())) {
            errors.phone = 'Numéro de téléphone invalide.'
        }

        if (!username.trim()) errors.username = 'Ce champ est obligatoire.'
        if (!password) {
            errors.password = 'Ce champ est obligatoire.'
        } else if (password.length < 6) {
            errors.password = 'Le mot de passe doit contenir au moins 6 caractères.'
        }
        if (!confirmPassword) {
            errors.confirmPassword = 'Ce champ est obligatoire.'
        } else if (password !== confirmPassword) {
            errors.confirmPassword = 'Les mots de passe ne correspondent pas.'
        }
        if (!roleId) errors.roleId = 'Veuillez choisir un rôle.'
        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Champs autorisés pour les erreurs de champ (évite d'afficher des clés inconnues)
    const KNOWN_FIELDS: ReadonlyArray<keyof FieldErrors> = ['firstname', 'lastname', 'email', 'phone', 'username', 'password', 'confirmPassword', 'roleId']

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setApiError(null)
        if (!validateFields()) return

        setIsSubmitting(true)
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstname, lastname, email, phone: phone.trim() || undefined, username, password, roleId }),
            })

            // Si la réponse n'est pas du JSON valide, on affiche un message générique
            let data: Record<string, unknown> = {}
            try {
                data = await response.json()
            } catch {
                if (!response.ok) {
                    setApiError('Une erreur est survenue. Veuillez réessayer plus tard.')
                    return
                }
            }

            if (!response.ok) {
                const field = typeof data.field === 'string' ? data.field : null
                const msg = typeof data.error === 'string' && data.error.length < 200 ? data.error : 'Une erreur est survenue.'

                // N'affiche l'erreur sur un champ que si c'est un champ connu
                if (field && KNOWN_FIELDS.includes(field as keyof FieldErrors)) {
                    setFieldErrors({ [field]: msg })
                } else {
                    setApiError(msg)
                }
                return
            }

            scheduleToast({
                message: "Votre compte a bien été créé. Il doit être validé par l'administration avant que vous puissiez vous connecter. Vous recevrez un mail de validation",
                type: 'success',
            })
            router.push('/login')
        } catch {
            setApiError('Impossible de contacter le serveur. Vérifiez votre connexion.')
        } finally {
            setIsSubmitting(false)
        }
    }


    return (
        <form onSubmit={handleSubmit} noValidate>
            {apiError && (
                <div
                    role="alert"
                    className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800 mb-4"
                >
                    {apiError}
                </div>
            )}

            {/* Prénom / Nom côte à côte */}
            <div className="flex gap-4 mb-4">
                <div className="flex-1">
                    <label htmlFor="firstname" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                        Prénom
                    </label>
                    <input
                        id="firstname"
                        type="text"
                        value={firstname}
                        onChange={(e) => setFirstname(e.target.value)}
                        className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                        aria-invalid={!!fieldErrors.firstname}
                        aria-describedby={fieldErrors.firstname ? 'firstname-error' : undefined}
                    />
                    {fieldErrors.firstname && (
                        <span id="firstname-error" className="text-xs text-red-700">{fieldErrors.firstname}</span>
                    )}
                </div>
                <div className="flex-1">
                    <label htmlFor="lastname" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                        Nom
                    </label>
                    <input
                        id="lastname"
                        type="text"
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                        aria-invalid={!!fieldErrors.lastname}
                        aria-describedby={fieldErrors.lastname ? 'lastname-error' : undefined}
                    />
                    {fieldErrors.lastname && (
                        <span id="lastname-error" className="text-xs text-red-700">{fieldErrors.lastname}</span>
                    )}
                </div>
            </div>

            {/* Email */}
            <div className="mb-4">
                <label htmlFor="email" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@etablissement.mg"
                    className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                {fieldErrors.email && (
                    <span id="email-error" className="text-xs text-red-700">{fieldErrors.email}</span>
                )}
            </div>
            
            {/* Téléphone */}
            <div className="mb-4">
                <label htmlFor="phone" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                    Téléphone (optionnel)
                </label>
                <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: +261 34 00 000 00"
                    className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                />
                {fieldErrors.phone && (
                    <span id="phone-error" className="text-xs text-red-700">{fieldErrors.phone}</span>
                )}
            </div>


            {/* Nom d'utilisateur */}
            <div className="mb-4">
                <label htmlFor="username" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                    {"Nom d'utilisateur"}
                </label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="pseudo"
                    className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                    aria-invalid={!!fieldErrors.username}
                    aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                />
                {fieldErrors.username && (
                    <span id="username-error" className="text-xs text-red-700">{fieldErrors.username}</span>
                )}
            </div>

            {/* Mot de passe / Confirmation côte à côte */}
            <div className="flex gap-4 mb-4">
                <div className="flex-1">
                    <label htmlFor="password" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                        Mot de passe
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-2.5 pr-10 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                            aria-invalid={!!fieldErrors.password}
                            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-brun-600 hover:text-brun-900 transition-colors"
                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {fieldErrors.password && (
                        <span id="password-error" className="text-xs text-red-700">{fieldErrors.password}</span>
                    )}
                </div>
                <div className="flex-1">
                    <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                        Confirmer
                    </label>
                    <div className="relative">
                        <input
                            id="confirmPassword"
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-2.5 pr-10 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                            aria-invalid={!!fieldErrors.confirmPassword}
                            aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm((p) => !p)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-brun-600 hover:text-brun-900 transition-colors"
                            aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                        >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                        <span id="confirmPassword-error" className="text-xs text-red-700">{fieldErrors.confirmPassword}</span>
                    )}
                </div>
            </div>

            {/* Rôle */}
            <div className="mb-4">
                <label htmlFor="roleId" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                    Je suis
                </label>
                <select
                    id="roleId"
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                    aria-invalid={!!fieldErrors.roleId}
                    aria-describedby={fieldErrors.roleId ? 'roleId-error' : undefined}
                >
                    <option value="">— Choisir —</option>
                    <option value="teacher">Enseignant</option>
                    <option value="student">Étudiant / Association</option>
                </select>
                {fieldErrors.roleId && (
                    <span id="roleId-error" className="text-xs text-red-700">{fieldErrors.roleId}</span>
                )}
            </div>

            <p className="text-xs text-brun-600 mb-4 -mt-1">
                Votre compte sera actif après validation par l&apos;administration.
            </p>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-1.5 py-2.5 bg-brun-800 text-brun-050 text-xs uppercase tracking-wide cursor-pointer hover:bg-brun-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm font-medium"
            >
                {isSubmitting ? 'Inscription...' : "S'inscrire"}
            </button>
        </form>
    )
}
