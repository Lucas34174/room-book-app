import { prisma } from './prisma'
import nodemailer from 'nodemailer'

// Helper to format Date objects returned by Prisma for @db.Time() into "HH:MM"
function formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

/**
 * Envoie de manière asynchrone l'email correspondant à une notification.
 * Met à jour le statut de la notification dans la base de données (SENT ou FAILED).
 */
export async function processEmailNotification(notificationId: number) {
    try {
        const notification = await prisma.notification.findUnique({
            where: { notificationId },
            include: {
                log: {
                    include: {
                        action: true,
                        user: true
                    }
                },
                booking: {
                    include: {
                        period: {
                            include: { room: true }
                        },
                        user: true
                    }
                }
            }
        })

        if (!notification) {
            console.error(`[processEmailNotification] Notification #${notificationId} non trouvée.`)
            return
        }

        if (notification.type !== 'EMAIL') return

        const booking = notification.booking
        if (!booking) {
            console.error(`[processEmailNotification] Aucun booking associé à la notification #${notificationId}.`)
            return
        }

        const recipientEmail = booking.user.email
        const roomName = booking.period.room.name
        const dateStr = booking.bookingDate.toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
        const timeRange = `${formatTime(booking.period.timeStart).replace(':', 'h')} – ${formatTime(booking.period.timeEnd).replace(':', 'h')}`

        const appName = 'RoomBook'
        const from = `"${appName}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT ?? '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        })

        let subject = ''
        let textContent = ''
        let htmlContent = ''
        const actionName = notification.log.action.name

        if (actionName === 'RESERVATION_CONFIRMEE' || actionName === 'RESERVATION_VALIDEE') {
            subject = `${appName} — Réservation confirmée : ${roomName}`
            textContent = `Bonjour,\n\nVotre réservation de la salle ${roomName} le ${dateStr} de ${timeRange} a été confirmée avec succès.\n\n— L'équipe ${appName}`
            htmlContent = `
<!DOCTYPE html><html lang="fr">
<body style="font-family:Georgia,serif;background:#faf5ec;color:#241812;padding:40px 20px;">
  <div style="max-width:460px;margin:0 auto;background:#faf5ec;border:1px solid #4a5c33;padding:36px;">
    <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#3a4a28;margin-bottom:6px;text-align:center;">RoomBook</p>
    <h1 style="font-size:20px;font-weight:normal;color:#2c3a1c;text-align:center;margin-bottom:24px;">Réservation confirmée !</h1>
    <p style="font-size:14px;margin-bottom:20px;">
      Votre réservation de salle a été confirmée avec succès.<br><br>
      <strong>Détails :</strong>
    </p>
    <ul style="font-size:13px;font-family:sans-serif;color:#332218;line-height:1.6;">
      <li><strong>Salle :</strong> ${roomName}</li>
      <li><strong>Date :</strong> ${dateStr}</li>
      <li><strong>Horaire :</strong> ${timeRange}</li>
    </ul>
    <hr style="border:none;border-top:1px solid #c2ccb6;margin:24px 0;">
    <p style="font-size:11px;color:#a67c52;text-align:center;">Merci d'utiliser nos services.<br>— L'équipe ${appName}</p>
  </div>
</body></html>`
        } else if (actionName === 'RESERVATION_REFUSEE' || actionName === 'RESERVATION_PRIORITAIRE') {
            const reason = booking.refusalReason || 'Aucun motif renseigné'
            subject = `${appName} — Votre demande de réservation a été refusée`
            textContent = `Bonjour,\n\nVotre demande de réservation de la salle ${roomName} le ${dateStr} de ${timeRange} a été refusée.\n\nMotif : ${reason}\n\n— L'équipe ${appName}`
            htmlContent = `
<!DOCTYPE html><html lang="fr">
<body style="font-family:Georgia,serif;background:#faf5ec;color:#241812;padding:40px 20px;">
  <div style="max-width:460px;margin:0 auto;background:#faf5ec;border:1px solid #c0392b;padding:36px;">
    <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a6240;margin-bottom:6px;text-align:center;">RoomBook</p>
    <h1 style="font-size:20px;font-weight:normal;color:#3d2a1c;text-align:center;margin-bottom:24px;">Demande refusée</h1>
    <p style="font-size:14px;margin-bottom:16px;">
      Votre demande de réservation de la salle <strong>${roomName}</strong><br>
      le ${dateStr} de ${timeRange} a été refusée.
    </p>
    <p style="font-size:13px;background:#fff5f5;border-left:3px solid #c0392b;padding:10px 14px;margin-bottom:20px;">
      <strong>Motif de refus :</strong><br>${reason}
    </p>
    <hr style="border:none;border-top:1px solid #d3bd9d;margin:24px 0;">
    <p style="font-size:11px;color:#a67c52;text-align:center;">— L'équipe ${appName}</p>
  </div>
</body></html>`
        } else if (actionName === 'RESERVATION_ANNULEE') {
            subject = `${appName} — Réservation annulée : ${roomName}`
            textContent = `Bonjour,\n\nVotre réservation de la salle ${roomName} le ${dateStr} de ${timeRange} a été annulée.\n\n— L'équipe ${appName}`
            htmlContent = `
<!DOCTYPE html><html lang="fr">
<body style="font-family:Georgia,serif;background:#faf5ec;color:#241812;padding:40px 20px;">
  <div style="max-width:460px;margin:0 auto;background:#faf5ec;border:1px solid #7f8c8d;padding:36px;">
    <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7f8c8d;margin-bottom:6px;text-align:center;">RoomBook</p>
    <h1 style="font-size:20px;font-weight:normal;color:#3d2a1c;text-align:center;margin-bottom:24px;">Réservation annulée</h1>
    <p style="font-size:14px;margin-bottom:20px;">
      Votre réservation de la salle <strong>${roomName}</strong> le ${dateStr} de ${timeRange} a été annulée.
    </p>
    <hr style="border:none;border-top:1px solid #d3bd9d;margin:24px 0;">
    <p style="font-size:11px;color:#a67c52;text-align:center;">— L'équipe ${appName}</p>
  </div>
</body></html>`
        } else if (actionName === 'RESERVATION_CREEE') {
            // Pour les demandes en attente
            subject = `${appName} — Demande de réservation enregistrée`
            textContent = `Bonjour,\n\nVotre demande de réservation pour la salle ${roomName} le ${dateStr} de ${timeRange} a bien été enregistrée et est en attente de validation.\n\n— L'équipe ${appName}`
            htmlContent = `
<!DOCTYPE html><html lang="fr">
<body style="font-family:Georgia,serif;background:#faf5ec;color:#241812;padding:40px 20px;">
  <div style="max-width:460px;margin:0 auto;background:#faf5ec;border:1px solid #d3bd9d;padding:36px;">
    <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a6240;margin-bottom:6px;text-align:center;">RoomBook</p>
    <h1 style="font-size:20px;font-weight:normal;color:#3d2a1c;text-align:center;margin-bottom:24px;">Demande en attente</h1>
    <p style="font-size:14px;margin-bottom:20px;">
      Votre demande de réservation de la salle <strong>${roomName}</strong> le ${dateStr} de ${timeRange} a bien été enregistrée et est en cours d'examen par le service logistique.
    </p>
    <hr style="border:none;border-top:1px solid #d3bd9d;margin:24px 0;">
    <p style="font-size:11px;color:#a67c52;text-align:center;">— L'équipe ${appName}</p>
  </div>
</body></html>`
        } else {
            console.warn(`[processEmailNotification] Action inconnue: ${actionName}. Notification ignorée.`)
            return
        }

        await transporter.sendMail({
            from,
            to: recipientEmail,
            subject,
            text: textContent.trim(),
            html: htmlContent.trim()
        })

        // En cas de succès, mettre à jour la base de données
        await prisma.notification.update({
            where: { notificationId },
            data: {
                status: 'SENT',
                sentAt: new Date()
            }
        })
        console.log(`[processEmailNotification] Notification EMAIL #${notificationId} envoyée avec succès à ${recipientEmail}.`)

    } catch (error) {
        console.error(`[processEmailNotification] Échec de l'envoi pour la notification #${notificationId}:`, error)
        // Mettre à jour avec le statut FAILED
        try {
            await prisma.notification.update({
                where: { notificationId },
                data: { status: 'FAILED' }
            })
        } catch (dbErr) {
            console.error('[processEmailNotification] Impossible de mettre à jour le statut FAILED:', dbErr)
        }
    }
}
