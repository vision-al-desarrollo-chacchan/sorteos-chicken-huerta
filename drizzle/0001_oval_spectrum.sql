ALTER TABLE `participantes` ADD `cantidad` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `participantes` ADD `monto` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `participantes` ADD `comprobante_key` text;--> statement-breakpoint
ALTER TABLE `participantes` ADD `actualizado` text;