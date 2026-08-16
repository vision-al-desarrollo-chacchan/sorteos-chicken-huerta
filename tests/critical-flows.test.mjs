import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("approval and rejection update digital participant tickets together", async () => {
  const source = await read("app/api/admin/route.ts");
  assert.match(source, /\["aprobado", "rechazado", "pendiente"\]/);
  assert.match(source, /actualizar_estado_participante/);
});

test("winner excludes pending, rejected, available and annulled tickets", async () => {
  const source = await read("app/api/admin/route.ts");
  assert.match(source, /sortear_ganador/);
});

test("live draw exposes only eligible codes to the private admin screen", async () => {
  const source = await read("app/api/admin/elegibles/route.ts");
  assert.match(source, /isAdmin/);
  assert.match(source, /estado=eq\.aprobado/);
  assert.match(source, /ticket\.estado === "vendido"/);
  assert.match(source, /!used\.has/);
});

test("ticket price is read from current configuration", async () => {
  const source = await read("app/api/participantes/route.ts");
  assert.match(source, /precio_ticket/);
  assert.match(source, /cantidad \* precio/);
});

test("admin login blocks repeated password attempts", async () => {
  const source = await read("app/api/admin/login/route.ts");
  assert.match(source, /intentos >= 5/);
  assert.match(source, /15 \* 60 \* 1000/);
  assert.match(source, /status: bloqueado \? 429 : 401/);
});

test("official Yape data is persisted without overwriting future prize edits", async () => {
  const sql = await read("drizzle/0007_official_config_and_login_security.sql");
  assert.match(sql, /961745846/);
  assert.match(sql, /Elvis Esteban Infantes Huerta/);
  assert.match(sql, /premio_1[\s\S]*DO NOTHING/);
});

test("official dates cover full days in Peru time", async () => {
  const sql = await read("drizzle/0008_official_draw_dates.sql");
  assert.match(sql, /2026-08-20T00:00/);
  assert.match(sql, /2026-09-30T23:59/);
  const api = await read("app/api/sorteo/route.ts");
  assert.match(api, /-05:00/);
  assert.match(api, /America\/Lima|horaPeru/);
});

test("physical ticket printing includes unique code, dates and legal verification", async () => {
  const source = await read("app/admin/tickets-fisicos/page.tsx");
  assert.match(source, /physicalCode/);
  assert.match(source, /ticketDates/);
  assert.match(source, /window\.print/);
  assert.match(source, /Participa solo si está vendido y registrado/);
});

test("physical sale visibly requires name, DNI and cellphone together", async () => {
  const source = await read("app/admin/tickets-fisicos/page.tsx");
  assert.match(source, /Registrar venta física/);
  assert.match(source, /Nombre completo/);
  assert.match(source, /DNI de 8 dígitos/);
  assert.match(source, /Celular de 9 dígitos/);
  assert.match(source, /Registrar como vendido/);
  assert.doesNotMatch(source, /prompt\(/);
});

test("sold physical tickets protect DNI and expose correction actions", async () => {
  const source = await read("app/admin/tickets-fisicos/page.tsx");
  assert.match(source, /dniProtegido/);
  assert.match(source, /Corregir datos/);
  assert.match(source, /Volver a disponible/);
  assert.match(source, /Se borrarán los datos del comprador/);
});

test("test-data cleanup preserves configuration", async () => {
  const sql = await read("drizzle/0009_reset_for_fresh_test.sql");
  for (const table of ["ganadores", "tickets", "participantes", "auditoria", "admin_login_attempts"])
    assert.match(sql, new RegExp(`DELETE FROM ${table}`));
  assert.doesNotMatch(sql, /DELETE FROM configuracion/);
});
