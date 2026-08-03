import RegisterForm from '../components/RegisterForm'
import { BookOpen } from 'lucide-react'

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-brun-950 bg-[image:linear-gradient(var(--brun-900)_1px,transparent_1px),linear-gradient(90deg,var(--brun-900)_1px,transparent_1px)] bg-[size:42px_42px] px-4 py-12">
            <div className="w-full max-w-[480px]">
                {/* Card */}
                <div className="bg-brun-050 border border-brun-400/70 px-9 py-9 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-7">
                        <div className="w-10 h-10 bg-brun-800 flex items-center justify-center mb-3">
                            <BookOpen className="w-5 h-5 text-brun-200" />
                        </div>
                        <p className="text-[11px] tracking-widest uppercase text-brun-500 mb-1">RoomBook</p>
                        <h1 className="text-xl font-light text-brun-900 tracking-wide" style={{ fontFamily: 'var(--font-playfair)' }}>
                            Créer un compte
                        </h1>
                    </div>

                    <RegisterForm />

                    <div className="mt-6 pt-5 border-t border-brun-200 text-center text-xs text-brun-600">
                        Déjà un compte ?{' '}
                        <a href="/login" className="text-brun-800 font-medium underline underline-offset-2 hover:text-brun-900">
                            Se connecter
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
