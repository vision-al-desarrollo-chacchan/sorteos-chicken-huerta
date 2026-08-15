CREATE TABLE `configuracion` (
	`clave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL,
	`actualizado` text NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`participante_id` integer,
	`tipo` text DEFAULT 'digital' NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`creado` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tickets`("id", "codigo", "participante_id", "tipo", "estado", "creado") SELECT "id", "codigo", "participante_id", 'digital', 'pendiente', "creado" FROM `tickets`;--> statement-breakpoint
DROP TABLE `tickets`;--> statement-breakpoint
ALTER TABLE `__new_tickets` RENAME TO `tickets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_codigo_unique` ON `tickets` (`codigo`);
