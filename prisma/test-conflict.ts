import './load-env'
import { prisma } from '../app/lib/prisma'
import { hashPassword } from '../app/lib/auth'
import { Prisma } from '../app/generated/prisma/client'

async function setupTestData() {
    console.log('--- Setting up test data ---')

    // 1. Roles
    const adminRole = await prisma.authRole.upsert({
        where: { name: 'admin' },
        update: {},
        create: { name: 'admin', description: 'Admin', maxActiveBookings: 99 }
    })
    const teacherRole = await prisma.authRole.upsert({
        where: { name: 'teacher' },
        update: {},
        create: { name: 'teacher', description: 'Teacher', maxActiveBookings: 99 }
    })
    const studentRole = await prisma.authRole.upsert({
        where: { name: 'student' },
        update: {},
        create: { name: 'student', description: 'Student', maxActiveBookings: 99 }
    })

    // 2. Users
    const adminUser = await prisma.user.upsert({
        where: { username: 'test_admin' },
        update: {},
        create: {
            username: 'test_admin',
            firstname: 'Test',
            lastname: 'Admin',
            email: 'admin@test.com',
            password: await hashPassword('password'),
            roleId: adminRole.roleId,
            enabled: true
        }
    })

    const teacherUser = await prisma.user.upsert({
        where: { username: 'test_teacher' },
        update: {},
        create: {
            username: 'test_teacher',
            firstname: 'Test',
            lastname: 'Teacher',
            email: 'teacher@test.com',
            password: await hashPassword('password'),
            roleId: teacherRole.roleId,
            enabled: true
        }
    })

    const studentUser1 = await prisma.user.upsert({
        where: { username: 'test_student1' },
        update: {},
        create: {
            username: 'test_student1',
            firstname: 'Test',
            lastname: 'Student1',
            email: 'student1@test.com',
            password: await hashPassword('password'),
            roleId: studentRole.roleId,
            enabled: true
        }
    })

    const studentUser2 = await prisma.user.upsert({
        where: { username: 'test_student2' },
        update: {},
        create: {
            username: 'test_student2',
            firstname: 'Test',
            lastname: 'Student2',
            email: 'student2@test.com',
            password: await hashPassword('password'),
            roleId: studentRole.roleId,
            enabled: true
        }
    })

    // 3. Room & Periods (Lundi = dayOfWeek 1)
    const testRoom = await prisma.room.create({
        data: {
            name: 'Salle Test Conflits',
            capacity: 30,
            location: 'Bâtiment T',
            bookable: true
        }
    })

    // Slot 1: Lundi 08:00 - 10:00
    const period1 = await prisma.period.create({
        data: {
            roomId: testRoom.roomId,
            dayOfWeek: 1,
            timeStart: new Date('1970-01-01T08:00:00.000Z'),
            timeEnd: new Date('1970-01-01T10:00:00.000Z'),
            note: 'Slot 1'
        }
    })

    // Slot 2: Lundi 10:00 - 12:00 (Adjacent)
    const period2 = await prisma.period.create({
        data: {
            roomId: testRoom.roomId,
            dayOfWeek: 1,
            timeStart: new Date('1970-01-01T10:00:00.000Z'),
            timeEnd: new Date('1970-01-01T12:00:00.000Z'),
            note: 'Slot 2'
        }
    })

    return {
        adminUser,
        teacherUser,
        studentUser1,
        studentUser2,
        testRoom,
        period1,
        period2
    }
}

async function cleanTestData(testRoomId: number) {
    console.log('--- Cleaning up test data ---')
    await prisma.booking.deleteMany({
        where: { period: { roomId: testRoomId } }
    })
    await prisma.period.deleteMany({
        where: { roomId: testRoomId }
    })
    await prisma.roomEquipment.deleteMany({
        where: { roomId: testRoomId }
    })
    await prisma.room.delete({
        where: { roomId: testRoomId }
    })
}

// Emulate POST /api/bookings inside transaction with custom roles
async function createBookingMock(
    userId: number,
    roleName: string,
    periodId: number,
    bookingDateStr: string,
    bookingReason: string
) {
    const dateObj = new Date(bookingDateStr + 'T00:00:00.000Z')
    const period = await prisma.period.findUnique({
        where: { periodId }
    })
    if (!period) throw new Error('Créneau introuvable.')

    const isPriorityUser = roleName === 'admin' || roleName === 'teacher'
    const initialStatus = isPriorityUser ? 'confirmee' : 'en_attente'

    return prisma.$transaction(async (tx) => {
        // Anti-conflict check
        const confirmedBooking = await tx.booking.findFirst({
            where: {
                periodId,
                bookingDate: dateObj,
                status: 'confirmee'
            }
        })

        if (confirmedBooking) {
            throw new Error('CONFLIT_CONFIRME')
        }

        // Priority override
        if (isPriorityUser) {
            await tx.booking.updateMany({
                where: {
                    periodId,
                    bookingDate: dateObj,
                    status: 'en_attente'
                },
                data: {
                    status: 'refusee',
                    refusalReason: 'Un enseignant a effectué une réservation prioritaire.'
                }
            })
        }

        return tx.booking.create({
            data: {
                userId,
                periodId,
                bookingDate: dateObj,
                startTime: period.timeStart,
                endTime: period.timeEnd,
                status: initialStatus as any,
                bookingReason
            }
        })
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    })
}

async function runTests() {
    let testData: any
    try {
        testData = await setupTestData()
    } catch (e) {
        console.error('Setup failed:', e)
        return
    }

    const { studentUser1, studentUser2, teacherUser, period1, period2 } = testData
    const testDate = '2026-08-03' // Un lundi

    let passed = 0
    let failed = 0

    function assert(condition: boolean, message: string) {
        if (condition) {
            console.log(`✅ [PASS] - ${message}`)
            passed++
        } else {
            console.error(`❌ [FAIL] - ${message}`)
            failed++
        }
    }

    // --- TEST 1: Réservation standard par un étudiant ---
    try {
        const booking = await createBookingMock(
            studentUser1.userId,
            'student',
            period1.periodId,
            testDate,
            'TD Algèbre'
        )
        assert(booking.status === 'en_attente', 'Réservation étudiant est bien mise en attente (en_attente).')
    } catch (err: any) {
        assert(false, `Test 1 a échoué avec l'erreur: ${err.message}`)
    }

    // --- TEST 2: Réservation d'un enseignant prioritaire sur un créneau avec demande en attente ---
    try {
        const teacherBooking = await createBookingMock(
            teacherUser.userId,
            'teacher',
            period1.periodId,
            testDate,
            'Cours Magistral réseaux'
        )
        assert(teacherBooking.status === 'confirmee', 'Réservation de l\'enseignant est directement confirmée (confirmee).')

        // Vérifier que la réservation de l'étudiant a été annulée/refusée
        const studentBooking = await prisma.booking.findFirst({
            where: {
                userId: studentUser1.userId,
                periodId: period1.periodId,
                bookingDate: new Date(testDate + 'T00:00:00.000Z')
            }
        })
        assert(studentBooking?.status === 'refusee', 'La demande en attente de l\'étudiant a bien été annulée (refusee).')
    } catch (err: any) {
        assert(false, `Test 2 a échoué avec l'erreur: ${err.message}`)
    }

    // --- TEST 3: Conflit direct - Tentative de réservation sur un créneau déjà CONFIRMÉ ---
    try {
        await createBookingMock(
            studentUser2.userId,
            'student',
            period1.periodId,
            testDate,
            'TD Chimie'
        )
        assert(false, 'Le conflit direct n\'a pas été détecté, la réservation a abouti (ANOMALIE).')
    } catch (err: any) {
        assert(err.message === 'CONFLIT_CONFIRME', 'Le conflit direct est bien détecté et rejeté.')
    }

    // --- TEST 4: Créneaux adjacents - Réservation sur un créneau collé au premier ---
    try {
        const bookingAdjacent = await createBookingMock(
            studentUser2.userId,
            'student',
            period2.periodId, // period2 est de 10:00 à 12:00, adjacent à period1 08:00-10:00
            testDate,
            'TD Physique'
        )
        assert(bookingAdjacent.status === 'en_attente', 'La réservation sur un créneau adjacent non conflictuel est autorisée.')
    } catch (err: any) {
        assert(false, `Test 4 a échoué avec l'erreur: ${err.message}`)
    }

    // --- TEST 5: Simulation de requêtes concurrentes simultanées ---
    try {
        console.log('Simulation de soumissions simultanées sur un nouveau créneau...');
        const periodSimultaneous = await prisma.period.create({
            data: {
                roomId: testData.testRoom.roomId,
                dayOfWeek: 1,
                timeStart: new Date('1970-01-01T14:00:00.000Z'),
                timeEnd: new Date('1970-01-01T16:00:00.000Z'),
                note: 'Simultaneous test'
            }
        })

        // On lance deux requêtes de réservations simultanées pour des enseignants
        // (les deux tentent d'avoir le statut 'confirmee')
        const results = await Promise.allSettled([
            createBookingMock(
                teacherUser.userId,
                'teacher',
                periodSimultaneous.periodId,
                testDate,
                'Cours A concurrent'
            ),
            createBookingMock(
                teacherUser.userId,
                'teacher',
                periodSimultaneous.periodId,
                testDate,
                'Cours B concurrent'
            )
        ])

        const fulfilled = results.filter(r => r.status === 'fulfilled')
        const rejected = results.filter(r => r.status === 'rejected')

        assert(
            fulfilled.length === 1 && rejected.length === 1,
            'Gestion de la concurrence : Une seule réservation simultanée a réussi, l\'autre a été rejetée.'
        )

        if (rejected.length === 1) {
            const error = (rejected[0] as PromiseRejectedResult).reason
            const errorMsg = error.message
            assert(
                errorMsg === 'CONFLIT_CONFIRME' || error.code === 'P2034' || errorMsg?.includes('serialization'),
                `La réservation rejetée a reçu une erreur de conflit/sérialisation cohérente : ${errorMsg}`
            )
        }

    } catch (err: any) {
        assert(false, `Test 5 a échoué avec l'erreur: ${err.message}`)
    }

    console.log(`\n=== BILAN DES TESTS ===\nTests réussis: ${passed}\nTests échoués: ${failed}\n=======================`)

    // Clean up
    if (testData?.testRoom?.roomId) {
        await cleanTestData(testData.testRoom.roomId)
    }

    await prisma.$disconnect()
}

runTests()
