import LoginForm from '../components/LoginForm'
import { BookOpen } from 'lucide-react'

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-brun-950 bg-[image:linear-gradient(var(--brun-900)_1px,transparent_1px),linear-gradient(90deg,var(--brun-900)_1px,transparent_1px)] bg-[size:42px_42px] px-4">
            <div className="w-full max-w-[400px]">
                {/* Card */}
                <div className="bg-brun-050 border border-brun-400/70 px-9 py-9 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-10 h-10 bg-brun-800 flex items-center justify-center mb-3">
                            <BookOpen className="w-5 h-5 text-brun-200" />
                        </div>
                        <p className="text-[11px] tracking-widest uppercase text-brun-500 mb-1">RoomBook</p>
                        <h1 className="text-xl font-light text-brun-900 tracking-wide" style={{ fontFamily: 'var(--font-playfair)' }}>
                            Connexion
                        </h1>
                    </div>

                    <LoginForm />

                    <div className="mt-6 pt-5 border-t border-brun-200 flex justify-center gap-4 text-xs text-brun-600">
                        <a href="/mdp-oublie" className="text-brun-700 hover:text-brun-900 underline underline-offset-2">
                            Mot de passe oublié ?
                        </a>
                        <span className="text-brun-300">·</span>
                        <a href="/inscription" className="text-brun-800 font-medium underline underline-offset-2 hover:text-brun-900">
                            Créer un compte
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}