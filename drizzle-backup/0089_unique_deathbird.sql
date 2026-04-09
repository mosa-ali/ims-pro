ALTER TABLE `bid_analyses` ADD `bomMeetingDate` varchar(50);--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `bomMeetingTime` varchar(50);--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `bomLocation` varchar(255);--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `bomAttendees` text;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `bomNotes` text;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `bomSignatures` text;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `bomCompleted` boolean DEFAULT false;