CREATE TABLE `ganadores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`premio` integer NOT NULL,
	`ticket_id` integer NOT NULL,
	`codigo` text NOT NULL,
	`participante_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`dni` text NOT NULL,
	`creado` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ganadores_premio_unique` ON `ganadores` (`premio`);--> statement-breakpoint
CREATE UNIQUE INDEX `ganadores_ticket_id_unique` ON `ganadores` (`ticket_id`);