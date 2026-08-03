import { Suspense } from 'react'
import ResetPasswordForm from '../components/ResetPasswordForm'
import { BookOpen } from 'lucide-react'

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-brun-950 bg-[image:linear-gradient(var(--brun-900)_1px,transparent_1px),linear-gradient(90deg,var(--brun-900)_1px,transparent_1px)] bg-[size:42px_42px] px-4">
            <div className="w-full max-w-[400px]">
                <div className="bg-brun-050 border border-brun-400/70 px-9 py-9 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-7">
                        <div className="w-10 h-10 bg-brun-800 flex items-center justify-center mb-3">
                            <BookOpen className="w-5 h-5 text-brun-200" />
                        </div>
                        <p className="text-[11px] tracking-widest uppercase text-brun-500 mb-1">RoomBook</p>
                        <h1 className="text-xl font-light text-brun-900 tracking-wide" style={{ fontFamily: 'var(--font-playfair)' }}>
                            Nouveau mot de passe
                        </h1>
                    </div>

                    {/* Suspense requis car useSearchParams() est un hook client dynamique */}
                    <Suspense fallback={<p className="text-center text-sm text-brun-600">Chargement…</p>}>
                        <ResetPasswordForm />
                    </Suspense>

                    <div className="mt-6 pt-5 border-t border-brun-200 text-center text-xs text-brun-600">
                        <a href="/login" className="text-brun-700 hover:text-brun-900 underline underline-offset-2">
                            ← Retour à la connexion
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
