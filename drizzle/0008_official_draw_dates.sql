INSERT INTO configuracion(clave,valor,actualizado) VALUES('inicio_sorteo','2026-08-20T00:00',datetime('now')) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor,actualizado=excluded.actualizado;
INSERT INTO configuracion(clave,valor,actualizado) VALUES('fin_sorteo','2026-09-30T23:59',datetime('now')) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor,actualizado=excluded.actualizado;
