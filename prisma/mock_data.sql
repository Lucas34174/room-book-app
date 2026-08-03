-- =====================================================================
-- MOCK DATA FOR ROOMBOOK APP (DYNAMIC TABLES ONLY)
-- Enforce clean, flat design & sharp look with comprehensive test data
-- =====================================================================

-- 1. Nettoyer les tables dynamiques
TRUNCATE TABLE notifications, logs, bookings RESTART IDENTITY CASCADE;

-- 2. Insérer les réservations (Bookings) pour la semaine courante
-- On utilise date_trunc('week', current_date) pour calculer dynamiquement les dates de cette semaine.

-- A. RÉSERVATIONS ENSEIGNANT (Bob - Utilisateur 'teacher') -> Toujours directes et confirmées ('confirmée')
-- Lundi 08:00 - 10:00 en Amphi A
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'teacher'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Amphi A') AND day_of_week = 1 AND time_start = '08:00:00'::time),
    (date_trunc('week', current_date)::date),
    '08:00:00'::time, '10:00:00'::time,
    'confirmée',
    now() - interval '3 days',
    'Cours Magistral - Électronique Analogique'
);

-- Lundi 14:00 - 16:00 en Salle 101
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'teacher'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle 101') AND day_of_week = 1 AND time_start = '14:00:00'::time),
    (date_trunc('week', current_date)::date),
    '14:00:00'::time, '16:00:00'::time,
    'confirmée',
    now() - interval '3 days',
    'TD Algorithmique avancée - Groupe A'
);

-- Mardi 10:00 - 12:00 en Salle 102 (Informatique)
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'teacher'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle 102') AND day_of_week = 2 AND time_start = '10:00:00'::time),
    (date_trunc('week', current_date) + interval '1 day')::date,
    '10:00:00'::time, '12:00:00'::time,
    'confirmée',
    now() - interval '2 days',
    'TP Programmation Web - Node.js'
);

-- Mercredi 16:00 - 18:00 en Labo Physique
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'teacher'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Labo Physique') AND day_of_week = 3 AND time_start = '16:00:00'::time),
    (date_trunc('week', current_date) + interval '2 days')::date,
    '16:00:00'::time, '18:00:00'::time,
    'confirmée',
    now() - interval '1 day',
    'TP d''Optique Ondulatoire'
);

-- Jeudi 08:00 - 10:00 en Amphi A
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'teacher'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Amphi A') AND day_of_week = 4 AND time_start = '08:00:00'::time),
    (date_trunc('week', current_date) + interval '3 days')::date,
    '08:00:00'::time, '10:00:00'::time,
    'confirmée',
    now(),
    'Cours Magistral - Mathématiques pour l''Ingénieur'
);

-- Vendredi 14:00 - 16:00 en Salle 101
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'teacher'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle 101') AND day_of_week = 5 AND time_start = '14:00:00'::time),
    (date_trunc('week', current_date) + interval '4 days')::date,
    '14:00:00'::time, '16:00:00'::time,
    'confirmée',
    now(),
    'TD Électronique Numérique'
);


-- B. DEMANDES ÉTUDIANTS CONFIRMÉES (Alice - Utilisateur 'student')
-- Lundi 16:00 - 18:00 en Salle de Réunion
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle de Réunion') AND day_of_week = 1 AND time_start = '16:00:00'::time),
    (date_trunc('week', current_date)::date),
    '16:00:00'::time, '18:00:00'::time,
    'confirmée',
    now() - interval '4 days',
    'Préparation soutenance projet de groupe'
);

-- Mardi 08:00 - 10:00 en Salle 101
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle 101') AND day_of_week = 2 AND time_start = '08:00:00'::time),
    (date_trunc('week', current_date) + interval '1 day')::date,
    '08:00:00'::time, '10:00:00'::time,
    'confirmée',
    now() - interval '3 days',
    'Travail d''étude et de recherche (TER)'
);

-- Mercredi 14:00 - 16:00 en Salle 102
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle 102') AND day_of_week = 3 AND time_start = '14:00:00'::time),
    (date_trunc('week', current_date) + interval '2 days')::date,
    '14:00:00'::time, '16:00:00'::time,
    'confirmée',
    now() - interval '2 days',
    'Projet développement d''application Web'
);

-- Vendredi 08:00 - 10:00 en Salle de Réunion
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle de Réunion') AND day_of_week = 5 AND time_start = '08:00:00'::time),
    (date_trunc('week', current_date) + interval '4 days')::date,
    '08:00:00'::time, '10:00:00'::time,
    'confirmée',
    now() - interval '1 day',
    'Assemblée générale de l''association étudiante'
);


-- C. DEMANDES ÉTUDIANTS EN ATTENTE (Alice - Utilisateur 'student')
-- Lundi 10:00 - 12:00 en Salle de Réunion
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle de Réunion') AND day_of_week = 1 AND time_start = '10:00:00'::time),
    (date_trunc('week', current_date)::date),
    '10:00:00'::time, '12:00:00'::time,
    'en attente',
    now() - interval '10 hours',
    'Réunion de coordination du BDE'
);

-- Mercredi 08:00 - 10:00 en Labo Physique
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Labo Physique') AND day_of_week = 3 AND time_start = '08:00:00'::time),
    (date_trunc('week', current_date) + interval '2 days')::date,
    '08:00:00'::time, '10:00:00'::time,
    'en attente',
    now() - interval '5 hours',
    'Révision collective TP Physique'
);

-- Jeudi 14:00 - 16:00 en Salle 102
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle 102') AND day_of_week = 4 AND time_start = '14:00:00'::time),
    (date_trunc('week', current_date) + interval '3 days')::date,
    '14:00:00'::time, '16:00:00'::time,
    'en attente',
    now(),
    'Atelier d''initiation à Linux'
);


-- D. DEMANDES ÉTUDIANTS REFUSÉES (Alice - Utilisateur 'student')
-- Mardi 14:00 - 16:00 en Amphi A
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, refusal_reason, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Amphi A') AND day_of_week = 2 AND time_start = '14:00:00'::time),
    (date_trunc('week', current_date) + interval '1 day')::date,
    '14:00:00'::time, '16:00:00'::time,
    'refusée',
    now() - interval '2 days',
    'Capacité excessive demandée pour un petit groupe de travail.',
    'Sessions de tutorat collectif d''informatique'
);

-- Mercredi 10:00 - 12:00 en Amphi A
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, refusal_reason, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Amphi A') AND day_of_week = 3 AND time_start = '10:00:00'::time),
    (date_trunc('week', current_date) + interval '2 days')::date,
    '10:00:00'::time, '12:00:00'::time,
    'refusée',
    now() - interval '1 day',
    'L''amphithéâtre est réservé aux enseignements académiques ce jour-là.',
    'Répétition de théâtre club Culture'
);


-- E. DEMANDES ÉTUDIANTS ANNULÉES PAR L'AUTEUR (Alice - Utilisateur 'student')
-- Jeudi 16:00 - 18:00 en Salle de Réunion
INSERT INTO bookings (user_id, period_id, booking_date, start_time, end_time, status, created_at, cancelled_at, cancel_reason, booking_reason)
VALUES (
    (SELECT user_id FROM users WHERE username = 'student'),
    (SELECT period_id FROM periods WHERE room_id = (SELECT room_id FROM rooms WHERE name = 'Salle de Réunion') AND day_of_week = 4 AND time_start = '16:00:00'::time),
    (date_trunc('week', current_date) + interval '3 days')::date,
    '16:00:00'::time, '18:00:00'::time,
    'annulée',
    now() - interval '2 days',
    now() - interval '1 day',
    'Réunion déplacée en distanciel sur Teams.',
    'Point d''avancement association'
);


-- 3. Insérer les Logs d'actions (Historique)
-- Raconter une histoire cohérente d'actions système

-- Log 1 : Création de la réservation Bob Amphi A
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_CONFIRMEE'),
    (SELECT user_id FROM users WHERE username = 'teacher'),
    'Réservation confirmée pour teacher - Salle: Amphi A, Date: ' || (date_trunc('week', current_date)::date)::text,
    now() - interval '3 days'
);

-- Log 2 : Création de la réservation Bob TD Algorithmique
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_CONFIRMEE'),
    (SELECT user_id FROM users WHERE username = 'teacher'),
    'Réservation confirmée pour teacher - Salle: Salle 101, Date: ' || (date_trunc('week', current_date)::date)::text,
    now() - interval '3 days'
);

-- Log 3 : Soumission demande Alice Salle Réunion (Lundi)
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_CREEE'),
    (SELECT user_id FROM users WHERE username = 'student'),
    'Demande de réservation soumise par student - Salle: Salle de Réunion, Date: ' || (date_trunc('week', current_date)::date)::text,
    now() - interval '4 days'
);

-- Log 4 : Validation de la demande d'Alice par le validateur (Diana)
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_VALIDEE'),
    (SELECT user_id FROM users WHERE username = 'validator'),
    'Demande de réservation #7 d''Alice approuvée pour Salle de Réunion par le service validateur.',
    now() - interval '3 days'
);

-- Log 5 : Soumission demande Alice Salle 101 (Mardi)
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_CREEE'),
    (SELECT user_id FROM users WHERE username = 'student'),
    'Demande de réservation soumise par student - Salle: Salle 101, Date: ' || ((date_trunc('week', current_date) + interval '1 day')::date)::text,
    now() - interval '3 days'
);

-- Log 6 : Validation de la demande de mardi par Diana
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_VALIDEE'),
    (SELECT user_id FROM users WHERE username = 'validator'),
    'Demande de réservation #8 d''Alice approuvée pour Salle 101 par le service validateur.',
    now() - interval '2 days'
);

-- Log 7 : Soumission de la demande refusée d'Alice pour Amphi A
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_CREEE'),
    (SELECT user_id FROM users WHERE username = 'student'),
    'Demande de réservation soumise par student - Salle: Amphi A, Date: ' || ((date_trunc('week', current_date) + interval '1 day')::date)::text,
    now() - interval '2 days'
);

-- Log 8 : Refus de la demande d'Amphi A par Diana
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_REFUSEE'),
    (SELECT user_id FROM users WHERE username = 'validator'),
    'Réservation #13 refusée par validator. Motif: Capacité excessive demandée pour un petit groupe de travail.',
    now() - interval '2 days'
);

-- Log 9 : Soumission de la demande annulée d'Alice
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_CREEE'),
    (SELECT user_id FROM users WHERE username = 'student'),
    'Demande de réservation soumise par student - Salle: Salle de Réunion, Date: ' || ((date_trunc('week', current_date) + interval '3 days')::date)::text,
    now() - interval '2 days'
);

-- Log 10 : Annulation par Alice
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_ANNULEE'),
    (SELECT user_id FROM users WHERE username = 'student'),
    'Réservation #15 annulée par student. Motif: Réunion déplacée en distanciel sur Teams.',
    now() - interval '1 day'
);

-- Log 11 : Soumission demande en attente 1 d'Alice (Lundi Réunion)
INSERT INTO logs (action_id, user_id, details, created_at)
VALUES (
    (SELECT action_id FROM actions WHERE name = 'RESERVATION_CREEE'),
    (SELECT user_id FROM users WHERE username = 'student'),
    'Demande de réservation soumise par student - Salle: Salle de Réunion, Date: ' || (date_trunc('week', current_date)::date)::text,
    now() - interval '10 hours'
);


-- 4. Insérer les Notifications In-App et Email associées
-- Lier les notifications aux logs récents pour l'étudiante Alice (userId 4)

-- Notification In-App 1 : Validation de réservation
INSERT INTO notifications (log_id, booking_id, type, status, sent_at)
VALUES (
    (SELECT log_id FROM logs WHERE details LIKE '%Alice approuvée pour Salle de Réunion%' LIMIT 1),
    (SELECT booking_id FROM bookings WHERE booking_reason = 'Préparation soutenance projet de groupe' LIMIT 1),
    'IN_APP',
    'SENT',
    now() - interval '3 days'
);

-- Notification Email 1 : Validation de réservation
INSERT INTO notifications (log_id, booking_id, type, status, sent_at)
VALUES (
    (SELECT log_id FROM logs WHERE details LIKE '%Alice approuvée pour Salle de Réunion%' LIMIT 1),
    (SELECT booking_id FROM bookings WHERE booking_reason = 'Préparation soutenance projet de groupe' LIMIT 1),
    'EMAIL',
    'SENT',
    now() - interval '3 days'
);

-- Notification In-App 2 : Refus de réservation
INSERT INTO notifications (log_id, booking_id, type, status, sent_at)
VALUES (
    (SELECT log_id FROM logs WHERE details LIKE '%Réservation #13 refusée%' LIMIT 1),
    (SELECT booking_id FROM bookings WHERE booking_reason = 'Sessions de tutorat collectif d''informatique' LIMIT 1),
    'IN_APP',
    'SENT',
    now() - interval '2 days'
);

-- Notification In-App 3 : Nouvelle demande BDE en attente (destinée au service logistique)
INSERT INTO notifications (log_id, booking_id, type, status, sent_at)
VALUES (
    (SELECT log_id FROM logs WHERE details LIKE '%Salle: Salle de Réunion, Date:%' AND details LIKE '%student%' ORDER BY log_id DESC LIMIT 1),
    (SELECT booking_id FROM bookings WHERE booking_reason = 'Réunion de coordination du BDE' LIMIT 1),
    'IN_APP',
    'PENDING',
    now() - interval '10 hours'
);
