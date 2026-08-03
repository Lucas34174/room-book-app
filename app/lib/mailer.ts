import nodemailer from 'nodemailer'

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
    const appName = 'RoomBook'
    const from = `"${appName}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`

    // Transporter créé ici (lazy) pour que les erreurs de config SMTP
    // soient capturées par le try/catch de l'appelant, pas à l'import du module
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    })

    await transporter.sendMail({
        from,
        to,
        subject: `${appName} — Réinitialisation de votre mot de passe`,
        text: `
Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe sur ${appName}.

Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe (valable 30 minutes) :

${resetUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.

— L'équipe ${appName}
        `.trim(),
        html: `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Georgia,serif;background:#faf5ec;color:#241812;padding:40px 20px;">
  <div style="max-width:460px;margin:0 auto;background:#faf5ec;border:1px solid #a67c52;padding:36px;">
    <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a6240;margin-bottom:6px;text-align:center;">RoomBook</p>
    <h1 style="font-size:20px;font-weight:normal;color:#3d2a1c;text-align:center;margin-bottom:24px;">Réinitialisation du mot de passe</h1>
    <p style="font-size:14px;margin-bottom:20px;">
      Vous avez demandé la réinitialisation de votre mot de passe.<br>
      Cliquez sur le bouton ci-dessous pour en définir un nouveau.<br>
      Ce lien est valable <strong>30 minutes</strong>.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${resetUrl}"
         style="display:inline-block;padding:10px 24px;background:#4f3826;color:#faf5ec;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:.05em;border:1px solid #4f3826;">
        Réinitialiser mon mot de passe
      </a>
    </div>
    <p style="font-size:12px;color:#8a6240;">
      Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe ne sera pas modifié.
    </p>
    <hr style="border:none;border-top:1px solid #d3bd9d;margin:24px 0;">
    <p style="font-size:11px;color:#a67c52;text-align:center;">
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
      <span style="word-break:break-all;">${resetUrl}</span>
    </p>
  </div>
</body>
</html>
        `.trim(),
    })
}

export async function sendAccountActivationEmail(to: string, loginUrl: string) {
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

    await transporter.sendMail({
        from,
        to,
        subject: `${appName} — Votre compte a été activé`,
        text: `
Bonjour,

Excellente nouvelle ! Votre compte sur ${appName} a été activé par un administrateur.

Vous pouvez dès à présent vous connecter et accéder à nos services en cliquant sur le lien suivant :

${loginUrl}

— L'équipe ${appName}
        `.trim(),
        html: `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Georgia,serif;background:#faf5ec;color:#241812;padding:40px 20px;">
  <div style="max-width:460px;margin:0 auto;background:#faf5ec;border:1px solid #4a5c33;padding:36px;">
    <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#3a4a28;margin-bottom:6px;text-align:center;">RoomBook</p>
    <h1 style="font-size:20px;font-weight:normal;color:#2c3a1c;text-align:center;margin-bottom:24px;">Compte activé</h1>
    <p style="font-size:14px;margin-bottom:20px;">
      Excellente nouvelle ! Votre compte a été activé par un administrateur.<br><br>
      Vous pouvez dès à présent vous connecter et accéder à nos services.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${loginUrl}"
         style="display:inline-block;padding:10px 24px;background:#4a5c33;color:#faf5ec;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:.05em;border:1px solid #4a5c33;">
        Me connecter
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #c2ccb6;margin:24px 0;">
    <p style="font-size:11px;color:#4a5c33;text-align:center;">
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
      <span style="word-break:break-all;">${loginUrl}</span>
    </p>
  </div>
</body>
</html>
        `.trim(),
    })
}

export async function sendBookingConfirmationEmail(
    to: string,
    roomName: string,
    dateStr: string,
    timeRange: string
) {
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

    await transporter.sendMail({
        from,
        to,
        subject: `${appName} — Réservation confirmée : ${roomName}`,
        text: `
Bonjour,

Votre réservation de salle a été confirmée avec succès.

Détails de la réservation :
- Salle : ${roomName}
- Date : ${dateStr}
- Horaire : ${timeRange}

— L'équipe ${appName}
        `.trim(),
        html: `
<!DOCTYPE html>
<html lang="fr">
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
    <p style="font-size:11px;color:#a67c52;text-align:center;">
      Merci d'utiliser nos services.<br>
      — L'équipe ${appName}
    </p>
  </div>
</body>
</html>
        `.trim(),
    })
}


export async function sendNewUserNotificationToAdmins(
    adminEmails: string[],
    newUser: { firstname: string; lastname: string; email: string; username: string; role: string }
) {
    if (adminEmails.length === 0) return

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

    const subject = `${appName} — Nouvelle inscription en attente de validation`
    const textContent = `Bonjour,\n\nUn nouvel utilisateur vient de s'inscrire sur ${appName} et attend la validation de son compte.\n\nNom : ${newUser.firstname} ${newUser.lastname}\nNom d'utilisateur : ${newUser.username}\nEmail : ${newUser.email}\nRôle demandé : ${newUser.role}\n\nRendez-vous dans la section Utilisateurs pour activer ce compte.\n\n— L'équipe ${appName}`

    const usersUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/utilisateurs`
    const htmlContent = `<!DOCTYPE html><html lang="fr"><body style="font-family:Georgia,serif;background:#faf5ec;color:#241812;padding:40px 20px;"><div style="max-width:480px;margin:0 auto;background:#faf5ec;border:1px solid #a67c52;padding:36px;"><p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a6240;margin-bottom:6px;text-align:center;">${appName}</p><h1 style="font-size:20px;font-weight:normal;color:#3d2a1c;text-align:center;margin-bottom:24px;">Nouvelle inscription en attente</h1><p style="font-size:14px;margin-bottom:16px;">Un nouvel utilisateur vient de s'inscrire et attend la validation de son compte :</p><table style="width:100%;font-size:13px;font-family:sans-serif;border-collapse:collapse;margin-bottom:20px;"><tr><td style="padding:6px 0;color:#8a6240;width:40%;">Nom</td><td style="padding:6px 0;font-weight:600;">${newUser.firstname} ${newUser.lastname}</td></tr><tr><td style="padding:6px 0;color:#8a6240;">Nom d'utilisateur</td><td style="padding:6px 0;">${newUser.username}</td></tr><tr><td style="padding:6px 0;color:#8a6240;">Email</td><td style="padding:6px 0;">${newUser.email}</td></tr><tr><td style="padding:6px 0;color:#8a6240;">Rôle demandé</td><td style="padding:6px 0;">${newUser.role}</td></tr></table><div style="text-align:center;margin-bottom:24px;"><a href="${usersUrl}" style="display:inline-block;padding:10px 24px;background:#4f3826;color:#faf5ec;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:.05em;border:1px solid #4f3826;">Gérer les utilisateurs</a></div><hr style="border:none;border-top:1px solid #d3bd9d;margin:24px 0;"><p style="font-size:11px;color:#a67c52;text-align:center;">— L'équipe ${appName}</p></div></body></html>`

    await transporter.sendMail({
        from,
        to: adminEmails.join(', '),
        subject,
        text: textContent,
        html: htmlContent,
    })
}
