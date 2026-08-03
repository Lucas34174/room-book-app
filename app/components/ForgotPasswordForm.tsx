'use client'

import { useState, FormEvent } from 'react'

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState('')
    const [emailError, setEmailError] = useState<string | null>(null)
    const [apiError, setApiError] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    function validate(): boolean {
        if (!email.trim()) { setEmailError('Ce champ est obligatoire.'); return false }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Adresse email invalide.'); return false }
        setEmailError(null)
        return true
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setApiError(null)
        if (!validate()) return

        setIsSubmitting(true)
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            })

            let data: Record<string, unknown> = {}
            try { data = await response.json() } catch { /* ignore */ }

            if (!response.ok) {
                const msg = typeof data.error === 'string' && data.error.length < 200
                    ? data.error : 'Une erreur est survenue.'
                setApiError(msg)
                return
            }

            setSubmitted(true)
        } catch {
            setApiError('Impossible de contacter le serveur. Vérifiez votre connexion.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="border-l-[3px] border-[#4a5c33] bg-[#eef1e6] px-3 py-2.5 text-[12.5px] text-[#3a4a28]">
                Si cet email est associé à un compte, un lien de réinitialisation vous a été envoyé. Pensez à vérifier vos spams.
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            {apiError && (
                <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800 mb-4">
                    {apiError}
                </div>
            )}

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
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-error' : undefined}
                />
                {emailError && (
                    <span id="email-error" className="text-xs text-red-700">{emailError}</span>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-1.5 py-2.5 border border-brun-800 bg-brun-800 text-brun-050 text-xs uppercase tracking-wide cursor-pointer hover:bg-brun-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? 'Envoi...' : 'Envoyer'}
            </button>
        </form>
    )
}
