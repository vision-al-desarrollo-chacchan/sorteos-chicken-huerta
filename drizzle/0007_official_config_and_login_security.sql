CREATE TABLE IF NOT EXISTS admin_login_attempts(clave TEXT PRIMARY KEY,intentos INTEGER NOT NULL DEFAULT 0,bloqueado_hasta INTEGER NOT NULL DEFAULT 0,actualizado TEXT NOT NULL);
INSERT INTO configuracion(clave,valor,actualizado) VALUES('yape_numero','961745846',datetime('now')) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor,actualizado=excluded.actualizado;
INSERT INTO configuracion(clave,valor,actualizado) VALUES('yape_titular','Elvis Esteban Infantes Huerta',datetime('now')) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor,actualizado=excluded.actualizado;
INSERT INTO configuracion(clave,valor,actualizado) VALUES('precio_ticket','5',datetime('now')) ON CONFLICT(clave) DO NOTHING;
INSERT INTO configuracion(clave,valor,actualizado) VALUES('premio_1','Rezzio Kratos Pro 4.0',datetime('now')) ON CONFLICT(clave) DO NOTHING;
INSERT INTO configuracion(clave,valor,actualizado) VALUES('premio_2','Tekken 250 Pro',datetime('now')) ON CONFLICT(clave) DO NOTHING;
INSERT INTO configuracion(clave,valor,actualizado) VALUES('imagen_1','/kratos-pro.png',datetime('now')) ON CONFLICT(clave) DO NOTHING;
INSERT INTO configuracion(clave,valor,actualizado) VALUES('imagen_2','/tekken-250-pro.png',datetime('now')) ON CONFLICT(clave) DO NOTHING;
INSERT INTO configuracion(clave,valor,actualizado) VALUES('condiciones','Cada ticket aprobado participa por ambos premios. Un mismo código no puede ganar dos veces.',datetime('now')) ON CONFLICT(clave) DO NOTHING;
