'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
    const router = useRouter()

    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const [fieldErrors, setFieldErrors] = useState<{
        identifier?: string
        password?: string
    }>({})
    const [apiError, setApiError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    function validateFields(): boolean {
        const errors: typeof fieldErrors = {}
        if (!identifier.trim()) errors.identifier = 'Ce champ est obligatoire.'
        if (!password) errors.password = 'Ce champ est obligatoire.'
        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setApiError(null)
        if (!validateFields()) return

        setIsSubmitting(true)
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            })

            // Si la réponse n'est pas du JSON valide, message générique
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
                const msg = typeof data.error === 'string' && data.error.length < 200
                    ? data.error
                    : 'Une erreur est survenue.'
                setApiError(msg)
                return
            }

            router.push('/dashboard')
            router.refresh()
        } catch {
            setApiError('Impossible de contacter le serveur. Vérifiez votre connexion.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            {/* .alert — affiché seulement si erreur API*/}
            {apiError && (
                <div
                    role="alert"
                    className="bg-brun-100 px-3 py-2.5 text-[12.5px] text-red-800 mb-4.5"
                >
                    {apiError}
                </div>
            )}

            <div className="mb-4">
                <label
                    htmlFor="identifier"
                    className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5"
                >
                    Email ou nom d&apos;utilisateur
                </label>
                <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="prenom.nom@etablissement.mg ou pseudo"
                    className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre
                     focus:outline-none focus:border-brun-700 focus:bg-white"
                    aria-invalid={!!fieldErrors.identifier}
                    aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
                />
                {fieldErrors.identifier && (
                    <span id="identifier-error" className="text-xs text-red-700">
                        {fieldErrors.identifier}
                    </span>
                )}
            </div>

            <div className="mb-4">
                <label
                    htmlFor="password"
                    className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5"
                >
                    Mot de passe
                </label>
                <div className="relative">
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-2.5 pr-10 py-2 border border-brun-400 bg-brun-050 text-sm text-encre
                       focus:outline-none focus:border-brun-700 focus:bg-white"
                        aria-invalid={!!fieldErrors.password}
                        aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-brun-600 hover:text-brun-900 transition-colors"
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                        {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                </div>
                {fieldErrors.password && (
                    <span id="password-error" className="text-xs text-red-700">
                        {fieldErrors.password}
                    </span>
                )}
            </div>

            {/* .btn */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-1.5 py-2.5 bg-brun-800 text-brun-050
                   text-xs uppercase tracking-wide cursor-pointer
                   hover:bg-brun-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm font-medium"
            >
                {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
        </form>
    )
}