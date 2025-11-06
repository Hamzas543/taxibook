import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["customer", "driver", "admin"]).default("customer").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Driver profiles with location and availability
 */
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vehicleType: varchar("vehicleType", { length: 50 }).notNull(),
  vehicleModel: varchar("vehicleModel", { length: 100 }),
  vehiclePlate: varchar("vehiclePlate", { length: 20 }).notNull(),
  vehicleColor: varchar("vehicleColor", { length: 30 }),
  vehicleCapacity: int("vehicleCapacity").default(4).notNull(),
  isAvailable: boolean("isAvailable").default(false).notNull(),
  currentLatitude: varchar("currentLatitude", { length: 20 }),
  currentLongitude: varchar("currentLongitude", { length: 20 }),
  rating: int("rating").default(5).notNull(), // 1-5 scale stored as integer
  totalRides: int("totalRides").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

/**
 * Ride requests and history
 */
export const rides = mysqlTable("rides", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  driverId: int("driverId"),
  pickupLatitude: varchar("pickupLatitude", { length: 20 }).notNull(),
  pickupLongitude: varchar("pickupLongitude", { length: 20 }).notNull(),
  pickupAddress: text("pickupAddress"),
  dropoffLatitude: varchar("dropoffLatitude", { length: 20 }),
  dropoffLongitude: varchar("dropoffLongitude", { length: 20 }),
  dropoffAddress: text("dropoffAddress"),
  status: mysqlEnum("status", ["pending", "accepted", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  isShared: boolean("isShared").default(false).notNull(),
  maxPassengers: int("maxPassengers").default(1).notNull(),
  currentPassengers: int("currentPassengers").default(1).notNull(),
  baseFare: int("baseFare").default(0).notNull(), // Stored in cents
  totalFare: int("totalFare").default(0).notNull(), // Stored in cents
  farePerPassenger: int("farePerPassenger").default(0).notNull(), // Stored in cents
  estimatedDistance: int("estimatedDistance"), // in meters
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ride = typeof rides.$inferSelect;
export type InsertRide = typeof rides.$inferInsert;

/**
 * Passengers in shared rides
 */
export const ridePassengers = mysqlTable("ride_passengers", {
  id: int("id").autoincrement().primaryKey(),
  rideId: int("rideId").notNull(),
  customerId: int("customerId").notNull(),
  pickupLatitude: varchar("pickupLatitude", { length: 20 }).notNull(),
  pickupLongitude: varchar("pickupLongitude", { length: 20 }).notNull(),
  pickupAddress: text("pickupAddress"),
  dropoffLatitude: varchar("dropoffLatitude", { length: 20 }),
  dropoffLongitude: varchar("dropoffLongitude", { length: 20 }),
  dropoffAddress: text("dropoffAddress"),
  fareShare: int("fareShare").default(0).notNull(), // Stored in cents
  status: mysqlEnum("status", ["pending", "confirmed", "picked_up", "dropped_off", "cancelled"]).default("pending").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RidePassenger = typeof ridePassengers.$inferSelect;
export type InsertRidePassenger = typeof ridePassengers.$inferInsert;

/**
 * Driver ratings and reviews
 */
export const ratings = mysqlTable("ratings", {
  id: int("id").autoincrement().primaryKey(),
  rideId: int("rideId").notNull(),
  driverId: int("driverId").notNull(),
  customerId: int("customerId").notNull(),
  rating: int("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = typeof ratings.$inferInsert;
