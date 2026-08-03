import Link from 'next/link'
import { ShieldOff, ArrowLeft } from 'lucide-react'

export default function NonAutorisePage() {
    return (
        <div className="min-h-screen bg-brun-050 flex flex-col items-center justify-center px-4">
            <div className="bg-white border border-[#d3bd9d] p-10 max-w-sm w-full text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="flex justify-center mb-5">
                    <div className="w-14 h-14 bg-brun-100 flex items-center justify-center rounded-sm">
                        <ShieldOff className="w-7 h-7 text-brun-700" strokeWidth={1.5} />
                    </div>
                </div>
                <h1 className="text-xl font-light text-brun-900 mb-2 tracking-wide" style={{ fontFamily: 'var(--font-playfair)' }}>
                    Accès refusé
                </h1>
                <p className="text-sm text-brun-600 mb-7 leading-relaxed">
                    Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
                    Contactez un administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
                </p>
                <Link
                    href="/accueil"
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider hover:bg-brun-900 transition-colors font-medium rounded-sm"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Retour au tableau de bord
                </Link>
            </div>
        </div>
    )
}
