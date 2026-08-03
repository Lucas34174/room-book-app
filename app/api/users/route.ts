import { prisma } from '../../lib/prisma'
import { NextResponse } from 'next/server'
import { Prisma } from '../../generated/prisma/client'
import { requireAdmin } from '../../lib/auth-helpers'

export async function GET(request: Request) {
    const guard = await requireAdmin()
    if (guard) return guard
    try {
        const { searchParams } = new URL(request.url)
        const roleIdParam = searchParams.get('roleId')
        const statusParam = searchParams.get('status')
        const qParam = searchParams.get('q')

        const where: Prisma.UserWhereInput = {}

        if (roleIdParam) {
            const roleId = parseInt(roleIdParam)
            if (!isNaN(roleId)) {
                where.roleId = roleId
            }
        }

        if (statusParam === 'true') {
            where.enabled = true
        } else if (statusParam === 'false') {
            where.enabled = false
        }

        if (qParam) {
            where.OR = [
                { firstname: { contains: qParam, mode: 'insensitive' } },
                { lastname: { contains: qParam, mode: 'insensitive' } },
                { email: { contains: qParam, mode: 'insensitive' } },
                { username: { contains: qParam, mode: 'insensitive' } }
            ]
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                userId: true,
                username: true,
                email: true,
                firstname: true,
                lastname: true,
                enabled: true,
                disableReason: true,
                role: {
                    select: {
                        roleId: true,
                        name: true,
                        description: true
                    }
                }
            },
            orderBy: [
                { lastname: 'asc' },
                { firstname: 'asc' }
            ]
        })

        // Also fetch roles for the filter dropdown
        const roles = await prisma.authRole.findMany({
            select: {
                roleId: true,
                name: true,
                description: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json({ users, roles })
    } catch (error) {
        console.error('[GET /api/users]', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors de la récupération des utilisateurs.' },
            { status: 500 }
        )
    }
}
