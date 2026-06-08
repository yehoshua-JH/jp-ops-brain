CREATE TABLE `action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`owner` varchar(100) NOT NULL,
	`task` text NOT NULL,
	`deadline` timestamp,
	`priority` enum('HIGH','MED','LOW') NOT NULL,
	`status` enum('open','complete') NOT NULL DEFAULT 'open',
	`domainTag` varchar(50),
	`sourceSession` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `action_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocker_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerId` int NOT NULL,
	`sessionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocker_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blockers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`description` text NOT NULL,
	`firstAppearedSession` int NOT NULL,
	`timesAppeared` int NOT NULL DEFAULT 1,
	`status` enum('open','resolved') NOT NULL DEFAULT 'open',
	`resolutionNote` text,
	`domainTag` varchar(50) NOT NULL,
	`isChronicFlag` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `blockers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tag` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`tier` varchar(50) NOT NULL,
	`color` varchar(20) NOT NULL,
	`idealEndState` text NOT NULL,
	`isEditable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `domains_tag_unique` UNIQUE(`tag`)
);
--> statement-breakpoint
CREATE TABLE `quick_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int,
	`content` text NOT NULL,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quick_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rollups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('Daily Rollup','Weekly Review','Monthly Review') NOT NULL,
	`date` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`executiveSummary` text NOT NULL,
	`operationalSummary` text NOT NULL,
	`consolidatedKeyPoints` text NOT NULL,
	`blockers` text NOT NULL,
	`decisionsMade` text NOT NULL,
	`allActionItems` text NOT NULL,
	`openQuestions` text NOT NULL,
	`recurringThemes` text,
	`systemMaturitySnapshot` text NOT NULL,
	`changelogDelta` text NOT NULL,
	`topPriorities` text,
	`timelineStamp` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rollups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_domain_maturity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`domainId` int NOT NULL,
	`maturityLevel` enum('Not started','Early','Developing','Functional with gaps','Solid','World-class') NOT NULL,
	`explanation` text NOT NULL,
	`changeFromPrevious` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_domain_maturity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionNumber` int NOT NULL,
	`date` timestamp NOT NULL,
	`inputFormat` varchar(50) NOT NULL,
	`meetingType` varchar(50) NOT NULL,
	`participants` text NOT NULL,
	`tone` varchar(100),
	`executiveSummary` text NOT NULL,
	`operationalSummary` text NOT NULL,
	`keyPoints` text NOT NULL,
	`activeBlockers` text NOT NULL,
	`decisionsMade` text NOT NULL,
	`actionItems` text NOT NULL,
	`openQuestions` text NOT NULL,
	`systemMaturityNotes` text NOT NULL,
	`changelogDelta` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_sessionNumber_unique` UNIQUE(`sessionNumber`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `timeline` (
	`id` int AUTO_INCREMENT NOT NULL,
	`month` varchar(7) NOT NULL,
	`timelineStamp` text NOT NULL,
	`rollupId` int,
	`isManualMilestone` boolean NOT NULL DEFAULT false,
	`domainTags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `timeline_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `sessionId_idx` ON `action_items` (`sessionId`);--> statement-breakpoint
CREATE INDEX `owner_idx` ON `action_items` (`owner`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `action_items` (`status`);--> statement-breakpoint
CREATE INDEX `priority_idx` ON `action_items` (`priority`);--> statement-breakpoint
CREATE INDEX `deadline_idx` ON `action_items` (`deadline`);--> statement-breakpoint
CREATE INDEX `blockerId_idx` ON `blocker_sessions` (`blockerId`);--> statement-breakpoint
CREATE INDEX `sessionId_idx` ON `blocker_sessions` (`sessionId`);--> statement-breakpoint
CREATE INDEX `domainTag_idx` ON `blockers` (`domainTag`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `blockers` (`status`);--> statement-breakpoint
CREATE INDEX `isChronicFlag_idx` ON `blockers` (`isChronicFlag`);--> statement-breakpoint
CREATE INDEX `sessionId_idx` ON `quick_notes` (`sessionId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `rollups` (`type`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `rollups` (`date`);--> statement-breakpoint
CREATE INDEX `sessionId_idx` ON `session_domain_maturity` (`sessionId`);--> statement-breakpoint
CREATE INDEX `domainId_idx` ON `session_domain_maturity` (`domainId`);--> statement-breakpoint
CREATE INDEX `sessionNumber_idx` ON `sessions` (`sessionNumber`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `sessions` (`date`);--> statement-breakpoint
CREATE INDEX `month_idx` ON `timeline` (`month`);--> statement-breakpoint
CREATE INDEX `rollupId_idx` ON `timeline` (`rollupId`);