DELETE FROM ganadores;
DELETE FROM tickets;
DELETE FROM participantes;
DELETE FROM auditoria;
DELETE FROM sqlite_sequence WHERE name IN ('ganadores','tickets','participantes','auditoria');
