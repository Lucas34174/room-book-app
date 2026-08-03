import { prisma } from '../../lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '../../lib/auth-helpers'

export async function GET(request: Request) {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    const { searchParams } = new URL(request.url)
    const actionIdParam = searchParams.get('actionId')
    const userIdParam = searchParams.get('userId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const whereClause: any = {}

    if (actionIdParam) {
        whereClause.actionId = parseInt(actionIdParam)
    }

    if (userIdParam) {
        whereClause.userId = parseInt(userIdParam)
    }

    if (startDateParam || endDateParam) {
        whereClause.createdAt = {}
        if (startDateParam) {
            const start = new Date(startDateParam)
            start.setHours(0, 0, 0, 0)
            if (!isNaN(start.getTime())) {
                whereClause.createdAt.gte = start
            }
        }
        if (endDateParam) {
            const end = new Date(endDateParam)
            end.setHours(23, 59, 59, 999)
            if (!isNaN(end.getTime())) {
                whereClause.createdAt.lte = end
            }
        }
    }

    try {
        // 1. Récupérer les logs filtrés
        const logs = await prisma.log.findMany({
            where: whereClause,
            include: {
                action: true,
                user: {
                    select: {
                        userId: true,
                        username: true,
                        firstname: true,
                        lastname: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const formatted = logs.map(l => ({
            logId: l.logId,
            actionName: l.action.name,
            actionDescription: l.action.description,
            userId: l.user.userId,
            username: l.user.username,
            name: `${l.user.firstname} ${l.user.lastname}`,
            details: l.details,
            createdAt: l.createdAt.toISOString()
        }))

        // 2. Récupérer tous les types d'actions présents pour alimenter le filtre
        const actions = await prisma.action.findMany({
            orderBy: {
                name: 'asc'
            }
        })

        // 3. Récupérer tous les utilisateurs pour alimenter le filtre
        const users = await prisma.user.findMany({
            select: {
                userId: true,
                username: true,
                firstname: true,
                lastname: true
            },
            orderBy: {
                username: 'asc'
            }
        })

        return NextResponse.json({
            logs: formatted,
            filters: {
                actions,
                users
            }
        })
    } catch (error) {
        console.error('[GET /api/logs]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération des logs.' },
            { status: 500 }
        )
    }
}
