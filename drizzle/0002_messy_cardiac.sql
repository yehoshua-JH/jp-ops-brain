CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`status` enum('active','at_risk','churned','prospect') NOT NULL DEFAULT 'active',
	`healthScore` int NOT NULL DEFAULT 70,
	`monthlyRevenue` decimal(10,2),
	`teamSize` int NOT NULL DEFAULT 0,
	`startDate` timestamp,
	`notes` text,
	`riskFlags` text,
	`assignedTeam` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`role` varchar(100) NOT NULL,
	`department` varchar(100),
	`status` enum('active','inactive','at_risk') NOT NULL DEFAULT 'active',
	`criticalityScore` int NOT NULL DEFAULT 5,
	`replacementReadiness` int NOT NULL DEFAULT 0,
	`processesOwned` text,
	`backupPerson` varchar(100),
	`skills` text,
	`notes` text,
	`hireDate` timestamp,
	`terminationDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`category` varchar(100) NOT NULL,
	`owner` varchar(100),
	`backupOwner` varchar(100),
	`documentationPct` int NOT NULL DEFAULT 0,
	`status` enum('documented','partial','undocumented','needs_update') NOT NULL DEFAULT 'undocumented',
	`automationOpportunity` enum('high','medium','low','none') NOT NULL DEFAULT 'none',
	`description` text,
	`steps` text,
	`domainTag` varchar(50),
	`linkedSessionIds` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `client_name_idx` ON `clients` (`name`);--> statement-breakpoint
CREATE INDEX `client_status_idx` ON `clients` (`status`);--> statement-breakpoint
CREATE INDEX `emp_name_idx` ON `employees` (`name`);--> statement-breakpoint
CREATE INDEX `emp_status_idx` ON `employees` (`status`);--> statement-breakpoint
CREATE INDEX `proc_category_idx` ON `processes` (`category`);--> statement-breakpoint
CREATE INDEX `proc_owner_idx` ON `processes` (`owner`);