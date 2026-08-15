CREATE TABLE `participantes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`dni` text NOT NULL,
	`celular` text NOT NULL,
	`operacion` text NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`creado` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`participante_id` integer NOT NULL,
	`creado` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_codigo_unique` ON `tickets` (`codigo`);