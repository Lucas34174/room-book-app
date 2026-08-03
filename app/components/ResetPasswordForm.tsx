'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { scheduleToast } from './ToastProvider'

type Status = 'checking' | 'valid' | 'invalid'

export default function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token') ?? ''

    const [status, setStatus] = useState<Status>('checking')
    const [tokenError, setTokenError] = useState<string | null>(null)

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({})
    const [apiError, setApiError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Vérification du token au chargement
    useEffect(() => {
        if (!token) {
            setStatus('invalid')
            setTokenError('Aucun token trouvé. Veuillez refaire une demande de réinitialisation.')
            return
        }

        fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
            .then(async (res) => {
                let data: Record<string, unknown> = {}
                try { data = await res.json() } catch { /* ignore */ }

                if (res.ok && data.valid) {
                    setStatus('valid')
                } else {
                    setStatus('invalid')
                    const msg = typeof data.error === 'string' && data.error.length < 200
                        ? data.error
                        : 'Ce lien est invalide ou a expiré.'
                    setTokenError(msg)
                }
            })
            .catch(() => {
                setStatus('invalid')
                setTokenError('Impossible de vérifier le lien. Vérifiez votre connexion.')
            })
    }, [token])

    function validate(): boolean {
        const errors: typeof fieldErrors = {}
        if (!password) {
            errors.password = 'Ce champ est obligatoire.'
        } else if (password.length < 6) {
            errors.password = 'Le mot de passe doit contenir au moins 6 caractères.'
        }
        if (!confirm) {
            errors.confirm = 'Ce champ est obligatoire.'
        } else if (password !== confirm) {
            errors.confirm = 'Les mots de passe ne correspondent pas.'
        }
        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setApiError(null)
        if (!validate()) return

        setIsSubmitting(true)
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            })

            let data: Record<string, unknown> = {}
            try { data = await response.json() } catch { /* ignore */ }

            if (!response.ok) {
                const msg = typeof data.error === 'string' && data.error.length < 200
                    ? data.error : 'Une erreur est survenue.'
                setApiError(msg)
                return
            }

            scheduleToast({
                message: 'Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.',
                type: 'success',
            })
            router.push('/login')
        } catch {
            setApiError('Impossible de contacter le serveur. Vérifiez votre connexion.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // État : vérification en cours
    if (status === 'checking') {
        return (
            <p className="text-center text-sm text-brun-600">Vérification du lien…</p>
        )
    }

    // État : token invalide / expiré
    if (status === 'invalid') {
        return (
            <div>
                <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800 mb-4">
                    {tokenError}
                </div>
                <a
                    href="/mdp-oublie"
                    className="block text-center text-xs text-brun-700 underline underline-offset-2"
                >
                    Faire une nouvelle demande
                </a>
            </div>
        )
    }

    // État : token valide → formulaire
    return (
        <form onSubmit={handleSubmit} noValidate>
            {apiError && (
                <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800 mb-4">
                    {apiError}
                </div>
            )}

            <div className="mb-4">
                <label htmlFor="new-password" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                    Nouveau mot de passe
                </label>
                <div className="relative">
                    <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-2.5 pr-10 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                        aria-invalid={!!fieldErrors.password}
                        aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-brun-600 hover:text-brun-900 transition-colors"
                        aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                {fieldErrors.password && (
                    <span id="password-error" className="text-xs text-red-700">{fieldErrors.password}</span>
                )}
            </div>

            <div className="mb-4">
                <label htmlFor="confirm-password" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5">
                    Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                    <input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="w-full pl-2.5 pr-10 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                        aria-invalid={!!fieldErrors.confirm}
                        aria-describedby={fieldErrors.confirm ? 'confirm-error' : undefined}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-brun-600 hover:text-brun-900 transition-colors"
                        aria-label={showConfirm ? 'Masquer' : 'Afficher'}>
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                {fieldErrors.confirm && (
                    <span id="confirm-error" className="text-xs text-red-700">{fieldErrors.confirm}</span>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-1.5 py-2.5 border border-brun-800 bg-brun-800 text-brun-050 text-xs uppercase tracking-wide cursor-pointer hover:bg-brun-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? 'Enregistrement...' : 'Valider'}
            </button>
        </form>
    )
}
