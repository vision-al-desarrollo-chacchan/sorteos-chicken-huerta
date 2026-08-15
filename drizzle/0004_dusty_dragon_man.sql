CREATE TABLE `auditoria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`accion` text NOT NULL,
	`detalle` text NOT NULL,
	`administrador` text NOT NULL,
	`creado` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tickets` ADD `comprador_nombre` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `comprador_dni` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `comprador_celular` text;