import './load-env'
import { prisma } from '../app/lib/prisma'
import { hashPassword } from '../app/lib/auth'

async function main() {
    console.log('--- Start Seeding Database ---')

    // 1. Nettoyer toutes les tables pour un état propre
    console.log('Nettoyage des données existantes...')
    await prisma.notification.deleteMany({})
    await prisma.log.deleteMany({})
    await prisma.booking.deleteMany({})
    await prisma.period.deleteMany({})
    await prisma.roomEquipment.deleteMany({})
    await prisma.room.deleteMany({})
    await prisma.equipment.deleteMany({})
    await prisma.action.deleteMany({})
    await prisma.passwordResetToken.deleteMany({})
    await prisma.roleAction.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.authRole.deleteMany({})

    // =====================================================
    // 2. RÔLES (données statiques, non créables par les utilisateurs)
    // =====================================================
    console.log('Seeding des rôles...')
    const adminRole = await prisma.authRole.create({
        data: {
            name: 'admin',
            description: 'Administrateur système avec accès complet à la gestion des utilisateurs, salles et équipements.',
            maxActiveBookings: 99,
        }
    })

    await prisma.authRole.create({
        data: {
            name: 'teacher',
            description: 'Enseignant : réservation directe confirmée automatiquement, sans validation requise.',
            maxActiveBookings: 5,
        }
    })

    await prisma.authRole.create({
        data: {
            name: 'student',
            description: 'Étudiant / Responsable association : soumet des demandes de réservation en attente de validation.',
            maxActiveBookings: 2,
        }
    })

    await prisma.authRole.create({
        data: {
            name: 'validator',
            description: 'Service Validateur (logistique) : traite les demandes de réservation en attente.',
            maxActiveBookings: 0,
        }
    })

    // =====================================================
    // 3. UTILISATEUR ADMIN (unique compte pré-créé)
    // =====================================================
    console.log('Seeding du compte administrateur...')
    const hashedPassword = await hashPassword('admin1234')

    await prisma.user.create({
        data: {
            username: 'admin',
            email: 'admin@roombook.mg',
            phone: '0341234567',
            firstname: 'Admin',
            lastname: 'Système',
            password: hashedPassword,
            roleId: adminRole.roleId,
            enabled: true,
        }
    })

    // =====================================================
    // 4. ÉQUIPEMENTS (catalogue de base)
    // =====================================================
    console.log('Seeding des équipements...')
    const eqProjecteur = await prisma.equipment.create({ data: { name: 'Vidéoprojecteur' } })
    const eqTableau    = await prisma.equipment.create({ data: { name: 'Tableau blanc' } })
    const eqAudio      = await prisma.equipment.create({ data: { name: 'Système audio' } })
    const eqPC         = await prisma.equipment.create({ data: { name: 'Ordinateur de bureau' } })
    const eqMicro      = await prisma.equipment.create({ data: { name: 'Microphone sans fil' } })
    const eqOscillo    = await prisma.equipment.create({ data: { name: 'Oscilloscope' } })
    const eqEcran      = await prisma.equipment.create({ data: { name: 'Grand écran tactile' } })

    // =====================================================
    // 5. SALLES (catalogue initial de salles)
    // =====================================================
    console.log('Seeding des salles...')
    const roomAmphi = await prisma.room.create({
        data: {
            name: 'Amphi A',
            capacity: 150,
            location: 'Bâtiment Principal, RDC',
            description: 'Grand amphithéâtre équipé pour les cours magistraux.',
            bookable: true,
        }
    })

    const room101 = await prisma.room.create({
        data: {
            name: 'Salle 101',
            capacity: 40,
            location: 'Bâtiment B, 1er étage',
            description: 'Salle de classe classique pour TD/TP.',
            bookable: true,
        }
    })

    const room102 = await prisma.room.create({
        data: {
            name: 'Salle 102',
            capacity: 30,
            location: 'Bâtiment B, 1er étage',
            description: 'Salle informatique équipée de postes connectés.',
            bookable: true,
        }
    })

    const roomMeeting = await prisma.room.create({
        data: {
            name: 'Salle de Réunion',
            capacity: 15,
            location: 'Bâtiment Administratif, RDC',
            description: 'Espace de réunion collaboratif.',
            bookable: true,
        }
    })

    const roomPhysique = await prisma.room.create({
        data: {
            name: 'Labo Physique',
            capacity: 25,
            location: 'Bâtiment C, RDC',
            description: 'Salle spécialisée pour les expériences scientifiques.',
            bookable: true,
        }
    })

    // =====================================================
    // 6. ASSOCIATIONS ÉQUIPEMENTS / SALLES
    // =====================================================
    console.log('Seeding des équipements par salle...')
    // Amphi A
    await prisma.roomEquipment.create({ data: { roomId: roomAmphi.roomId, equipmentId: eqProjecteur.equipmentId, quantity: 2, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: roomAmphi.roomId, equipmentId: eqTableau.equipmentId,    quantity: 1, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: roomAmphi.roomId, equipmentId: eqAudio.equipmentId,     quantity: 1, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: roomAmphi.roomId, equipmentId: eqMicro.equipmentId,     quantity: 2, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: roomAmphi.roomId, equipmentId: eqEcran.equipmentId,     quantity: 1, usable: true } })

    // Salle 101
    await prisma.roomEquipment.create({ data: { roomId: room101.roomId, equipmentId: eqProjecteur.equipmentId, quantity: 1, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: room101.roomId, equipmentId: eqTableau.equipmentId,    quantity: 1, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: room101.roomId, equipmentId: eqEcran.equipmentId,      quantity: 1, usable: true } })

    // Salle 102 (Informatique)
    await prisma.roomEquipment.create({ data: { roomId: room102.roomId, equipmentId: eqPC.equipmentId,         quantity: 30, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: room102.roomId, equipmentId: eqProjecteur.equipmentId, quantity: 1,  usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: room102.roomId, equipmentId: eqTableau.equipmentId,    quantity: 1,  usable: true } })

    // Salle de Réunion
    await prisma.roomEquipment.create({ data: { roomId: roomMeeting.roomId, equipmentId: eqProjecteur.equipmentId, quantity: 1, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: roomMeeting.roomId, equipmentId: eqTableau.equipmentId,    quantity: 1, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: roomMeeting.roomId, equipmentId: eqAudio.equipmentId,      quantity: 1, usable: true } })

    // Labo Physique
    await prisma.roomEquipment.create({ data: { roomId: roomPhysique.roomId, equipmentId: eqOscillo.equipmentId, quantity: 12, usable: true } })
    await prisma.roomEquipment.create({ data: { roomId: roomPhysique.roomId, equipmentId: eqTableau.equipmentId,  quantity: 1,  usable: true } })

    // =====================================================
    // 8. ACTIONS SYSTÈME (registre complet de traçabilité)
    // =====================================================
    console.log('Seeding des actions système...')
    const actionsData = [
        { name: 'RESERVATION_CREEE',     description: 'Soumission d\'une demande de réservation en attente par un étudiant.' },
        { name: 'RESERVATION_CONFIRMEE', description: 'Création d\'une réservation directe par un enseignant (confirmée automatiquement).' },
        { name: 'RESERVATION_VALIDEE',   description: 'Validation d\'une réservation par le service validateur.' },
        { name: 'RESERVATION_REFUSEE',   description: 'Refus d\'une demande de réservation par le service validateur.' },
        { name: 'RESERVATION_ANNULEE',   description: 'Annulation d\'une réservation par son créateur.' },
        { name: 'RESERVATION_PRIORITAIRE', description: 'Refus automatique d\'une demande en attente écrasée par une réservation prioritaire d\'un enseignant.' },
        { name: 'COMPTE_ACTIVE',         description: 'Activation d\'un compte utilisateur par un administrateur.' },
        { name: 'COMPTE_DESACTIVE',      description: 'Désactivation d\'un compte utilisateur par un administrateur.' },
        { name: 'COMPTE_ROLE_MODIFIE',   description: 'Modification du rôle d\'un compte utilisateur par un administrateur.' },
        { name: 'SALLE_AJOUTEE',         description: 'Ajout d\'une nouvelle salle dans le système par un administrateur.' },
        { name: 'SALLE_MODIFIEE',        description: 'Modification des caractéristiques d\'une salle par un administrateur.' },
        { name: 'SALLE_DESACTIVEE',      description: 'Désactivation d\'une salle par un administrateur.' },
        { name: 'EQUIPEMENT_AJOUTE',     description: 'Création d\'un nouvel équipement de base dans le catalogue.' },
        { name: 'EQUIPEMENT_ASSOCIE',    description: 'Association d\'un équipement avec sa quantité à une salle de classe.' },
        { name: 'INSCRIPTION_COMPTE',    description: 'Nouveau compte utilisateur inscrit, en attente de validation par l\'administrateur.' },
    ]

    for (const act of actionsData) {
        await prisma.action.create({ data: act })
    }

    console.log('--- Database Seeding Completed Successfully ---')
    console.log('')
    console.log('  Compte admin créé :')
    console.log('    Username : admin')
    console.log('    Password : admin1234')
    console.log('')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })