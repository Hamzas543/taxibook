import { eq, and, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, drivers, rides, ridePassengers, ratings, Driver, InsertDriver, Ride, InsertRide, InsertRidePassenger, InsertRating } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phoneNumber"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Driver queries
export async function createDriver(driver: InsertDriver) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(drivers).values(driver);
}

export async function getDriverByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDriverLocation(driverId: number, latitude: string, longitude: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(drivers)
    .set({ currentLatitude: latitude, currentLongitude: longitude })
    .where(eq(drivers.id, driverId));
}

export async function updateDriverAvailability(driverId: number, isAvailable: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(drivers)
    .set({ isAvailable })
    .where(eq(drivers.id, driverId));
}

export async function getAvailableDrivers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(drivers).where(eq(drivers.isAvailable, true));
}

// Ride queries
export async function createRide(ride: InsertRide) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(rides).values(ride);
  return result;
}

export async function getRideById(rideId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPendingRides() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(rides).where(eq(rides.status, "pending"));
}

export async function getCustomerRides(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(rides)
    .where(eq(rides.customerId, customerId))
    .orderBy(desc(rides.createdAt));
}

export async function getDriverRides(driverId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(rides)
    .where(eq(rides.driverId, driverId))
    .orderBy(desc(rides.createdAt));
}

export async function updateRideStatus(rideId: number, status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled", driverId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  
  if (status === "accepted" && driverId) {
    updateData.driverId = driverId;
    updateData.acceptedAt = new Date();
  } else if (status === "in_progress") {
    updateData.startedAt = new Date();
  } else if (status === "completed") {
    updateData.completedAt = new Date();
  } else if (status === "cancelled") {
    updateData.cancelledAt = new Date();
  }

  await db.update(rides).set(updateData).where(eq(rides.id, rideId));
}

export async function getAvailableSharedRides(pickupLat: string, pickupLng: string) {
  const db = await getDb();
  if (!db) return [];

  // Get shared rides that are pending or accepted and have available capacity
  return await db.select().from(rides)
    .where(
      and(
        eq(rides.isShared, true),
        sql`${rides.status} IN ('pending', 'accepted')`,
        sql`${rides.currentPassengers} < ${rides.maxPassengers}`
      )
    );
}

// Ride passenger queries
export async function addRidePassenger(passenger: InsertRidePassenger) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(ridePassengers).values(passenger);
}

export async function getRidePassengers(rideId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(ridePassengers).where(eq(ridePassengers.rideId, rideId));
}

// Rating queries
export async function createRating(rating: InsertRating) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(ratings).values(rating);
  
  // Update driver's average rating
  const driverRatings = await db.select().from(ratings).where(eq(ratings.driverId, rating.driverId));
  const avgRating = Math.round(driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length);
  
  await db.update(drivers)
    .set({ rating: avgRating })
    .where(eq(drivers.id, rating.driverId));
}

export async function getDriverRatings(driverId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(ratings)
    .where(eq(ratings.driverId, driverId))
    .orderBy(desc(ratings.createdAt));
}
