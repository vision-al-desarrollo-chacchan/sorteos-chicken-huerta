DELETE FROM ganadores;
DELETE FROM tickets;
DELETE FROM participantes;
DELETE FROM auditoria;
DELETE FROM admin_login_attempts;
DELETE FROM sqlite_sequence WHERE name IN ('ganadores','tickets','participantes','auditoria','admin_login_attempts');
