import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const participantes = sqliteTable("participantes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  dni: text("dni").notNull(),
  celular: text("celular").notNull(),
  operacion: text("operacion").notNull().unique(),
  cantidad: integer("cantidad").notNull().default(1),
  monto: integer("monto").notNull().default(5),
  comprobanteKey: text("comprobante_key"),
  estado: text("estado").notNull().default("pendiente"),
  creado: text("creado").notNull(),
  actualizado: text("actualizado"),
});
export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  participanteId: integer("participante_id"),
  tipo: text("tipo").notNull().default("digital"),
  estado: text("estado").notNull().default("pendiente"),
  compradorNombre: text("comprador_nombre"),
  compradorDni: text("comprador_dni"),
  compradorCelular: text("comprador_celular"),
  creado: text("creado").notNull(),
});
export const ganadores = sqliteTable("ganadores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  premio: integer("premio").notNull().unique(),
  ticketId: integer("ticket_id").notNull().unique(),
  codigo: text("codigo").notNull(),
  participanteId: integer("participante_id").notNull(),
  nombre: text("nombre").notNull(),
  dni: text("dni").notNull(),
  creado: text("creado").notNull(),
});
export const configuracion = sqliteTable("configuracion", {
  clave: text("clave").primaryKey(),
  valor: text("valor").notNull(),
  actualizado: text("actualizado").notNull(),
});
export const auditoria = sqliteTable("auditoria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accion: text("accion").notNull(),
  detalle: text("detalle").notNull(),
  administrador: text("administrador").notNull(),
  creado: text("creado").notNull(),
});
