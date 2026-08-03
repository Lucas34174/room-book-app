import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from './app/lib/auth'

// Pages publiques (accessibles sans authentification)
const PUBLIC_PATHS = ['/login', '/inscription', '/mdp-oublie', '/reinitialisation']

// Pages réservées aux admins uniquement
const ADMIN_ONLY_PATHS = ['/utilisateurs', '/salles', '/statistiques', '/logs']

// Pages réservées aux admins ET validators (Service Validateur)
const VALIDATOR_PATHS = ['/demandes']

// API routes réservées aux admins uniquement
const ADMIN_ONLY_API_PREFIXES = [
    '/api/users',
    '/api/stats',
    '/api/logs',
    // /api/rooms is admin-only EXCEPT /api/rooms/search which is for all authenticated users
]


// API routes réservées aux admins ET validators
const VALIDATOR_API_PREFIXES = [
    '/api/bookings/pending',
    '/api/bookings/',   // traité plus finement ci-dessous pour /validate
]

// API routes accessibles à tous les utilisateurs connectés (non-admin inclus)
const AUTHENTICATED_API_PREFIXES = [
    '/api/rooms/search',
    '/api/equipments',
    '/api/bookings',
    '/api/auth/me',
    '/api/profile',
    '/api/notifications',
    '/api/dashboard',
]

// API routes publiques (pas besoin d'auth)
const PUBLIC_API_PATHS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/logout',
]

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Ignorer les fichiers statiques et les assets Next.js
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/public')
    ) {
        return NextResponse.next()
    }

    // Lire le token de session
    const token = request.cookies.get('session_token')?.value ?? null
    const session = token ? await verifyJWT(token) : null

    // Redirection de la racine '/' → dashboard si connecté, sinon login
    if (pathname === '/') {
        if (session) {
            return NextResponse.redirect(new URL('/accueil', request.url))
        } else {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // ---- Gestion des routes API ----
    if (pathname.startsWith('/api/')) {
        // API publiques : laisser passer sans vérification
        if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
            return NextResponse.next()
        }

        // Routes de validation de réservation : admin + validator seulement
        const isValidateRoute =
            pathname.startsWith('/api/bookings/pending') ||
            /^\/api\/bookings\/\d+\/validate$/.test(pathname)

        if (isValidateRoute) {
            if (!session) {
                return NextResponse.json(
                    { error: 'Vous devez être connecté pour effectuer cette action.' },
                    { status: 401 }
                )
            }
            if (session.roleName !== 'validator') {
                return NextResponse.json(
                    { error: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.' },
                    { status: 403 }
                )
            }
            return NextResponse.next()
        }

        // API pour tous les utilisateurs connectés (ex: recherche de salle, mes réservations)
        // Note: isRoomDetailGet est défini plus bas — on anticipe ici la même logique regex
        const isRoomGetById = /^\/api\/rooms\/\d+$/.test(pathname) && request.method === 'GET'
        const isRoomPeriodsGet = /^\/api\/rooms\/\d+\/periods$/.test(pathname) && request.method === 'GET'
        const isAuthOnlyRoute =
            AUTHENTICATED_API_PREFIXES.some((p) => pathname.startsWith(p)) ||
            (pathname.startsWith('/api/rooms/') && pathname.endsWith('/availability')) ||
            isRoomGetById ||
            isRoomPeriodsGet

        if (isAuthOnlyRoute) {
            if (!session) {
                return NextResponse.json(
                    { error: 'Vous devez être connecté pour effectuer cette action.' },
                    { status: 401 }
                )
            }
            return NextResponse.next()
        }

        // API admin : vérifier session et rôle
        // /api/rooms/* (sauf routes d'accès public/authentifié gérées ci-dessus) est admin-only
        // Note: GET /api/rooms/:id est déjà intercepté par isAuthOnlyRoute ci-dessus
        const isAdminRoute =
            ADMIN_ONLY_API_PREFIXES.some((p) => pathname.startsWith(p)) ||
            (pathname.startsWith('/api/rooms') && !pathname.endsWith('/availability') && !isRoomGetById)

        if (isAdminRoute) {
            if (!session) {
                return NextResponse.json(
                    { error: 'Vous devez être connecté pour effectuer cette action.' },
                    { status: 401 }
                )
            }
            if (session.roleName !== 'admin') {
                return NextResponse.json(
                    { error: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.' },
                    { status: 403 }
                )
            }
        }

        return NextResponse.next()
    }

    // ---- Gestion des pages ----

    // Pages publiques : laisser passer
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        // Si l'utilisateur est déjà connecté et essaie d'accéder à /login ou /inscription
        // le rediriger vers le dashboard
        if (session && (pathname === '/login' || pathname === '/inscription')) {
            return NextResponse.redirect(new URL('/accueil', request.url))
        }
        return NextResponse.next()
    }

    // Toutes les autres pages : exiger une session valide
    if (!session) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Pages admin uniquement (salles, utilisateurs)
    if (ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        if (session.roleName !== 'admin') {
            return NextResponse.redirect(new URL('/non-autorise', request.url))
        }
    }

    // Pages validator (validator uniquement) - ex: /demandes
    if (VALIDATOR_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        if (session.roleName !== 'validator') {
            return NextResponse.redirect(new URL('/non-autorise', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Correspond à tous les chemins SAUF :
         * - _next/static (fichiers statiques)
         * - _next/image (optimisation d'images)
         * - favicon.ico
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
