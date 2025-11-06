CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vehicleType` varchar(50) NOT NULL,
	`vehicleModel` varchar(100),
	`vehiclePlate` varchar(20) NOT NULL,
	`vehicleColor` varchar(30),
	`vehicleCapacity` int NOT NULL DEFAULT 4,
	`isAvailable` boolean NOT NULL DEFAULT false,
	`currentLatitude` varchar(20),
	`currentLongitude` varchar(20),
	`rating` int NOT NULL DEFAULT 5,
	`totalRides` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rideId` int NOT NULL,
	`driverId` int NOT NULL,
	`customerId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ride_passengers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rideId` int NOT NULL,
	`customerId` int NOT NULL,
	`pickupLatitude` varchar(20) NOT NULL,
	`pickupLongitude` varchar(20) NOT NULL,
	`pickupAddress` text,
	`dropoffLatitude` varchar(20),
	`dropoffLongitude` varchar(20),
	`dropoffAddress` text,
	`fareShare` int NOT NULL DEFAULT 0,
	`status` enum('pending','confirmed','picked_up','dropped_off','cancelled') NOT NULL DEFAULT 'pending',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ride_passengers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`driverId` int,
	`pickupLatitude` varchar(20) NOT NULL,
	`pickupLongitude` varchar(20) NOT NULL,
	`pickupAddress` text,
	`dropoffLatitude` varchar(20),
	`dropoffLongitude` varchar(20),
	`dropoffAddress` text,
	`status` enum('pending','accepted','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`isShared` boolean NOT NULL DEFAULT false,
	`maxPassengers` int NOT NULL DEFAULT 1,
	`currentPassengers` int NOT NULL DEFAULT 1,
	`baseFare` int NOT NULL DEFAULT 0,
	`totalFare` int NOT NULL DEFAULT 0,
	`farePerPassenger` int NOT NULL DEFAULT 0,
	`estimatedDistance` int,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','driver','admin') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `users` ADD `phoneNumber` varchar(20);