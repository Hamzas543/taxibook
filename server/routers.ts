import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

// Helper to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper to calculate fare based on distance
function calculateFare(distanceInMeters: number, passengers: number = 1): number {
  const baseFare = 500; // 5.00 in cents
  const perKmRate = 150; // 1.50 per km in cents
  const distanceInKm = distanceInMeters / 1000;
  const totalFare = baseFare + (distanceInKm * perKmRate);
  const farePerPassenger = Math.round(totalFare / passengers);
  
  return farePerPassenger;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phoneNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUser({
          openId: ctx.user.openId,
          name: input.name,
          phoneNumber: input.phoneNumber,
        });
        return { success: true };
      }),
  }),

  driver: router({
    register: protectedProcedure
      .input(z.object({
        vehicleType: z.string(),
        vehicleModel: z.string(),
        vehiclePlate: z.string(),
        vehicleColor: z.string(),
        vehicleCapacity: z.number().min(1).max(8),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getDriverByUserId(ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Already registered as driver" });
        }

        await db.createDriver({
          userId: ctx.user.id,
          ...input,
        });

        return { success: true };
      }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDriverByUserId(ctx.user.id);
    }),

    updateLocation: protectedProcedure
      .input(z.object({
        latitude: z.string(),
        longitude: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const driver = await db.getDriverByUserId(ctx.user.id);
        if (!driver) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Driver profile not found" });
        }

        await db.updateDriverLocation(driver.id, input.latitude, input.longitude);
        return { success: true };
      }),

    toggleAvailability: protectedProcedure
      .input(z.object({
        isAvailable: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const driver = await db.getDriverByUserId(ctx.user.id);
        if (!driver) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Driver profile not found" });
        }

        await db.updateDriverAvailability(driver.id, input.isAvailable);
        return { success: true };
      }),

    getPendingRides: protectedProcedure.query(async ({ ctx }) => {
      const driver = await db.getDriverByUserId(ctx.user.id);
      if (!driver) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Driver profile not found" });
      }

      return await db.getPendingRides();
    }),

    acceptRide: protectedProcedure
      .input(z.object({
        rideId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const driver = await db.getDriverByUserId(ctx.user.id);
        if (!driver) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Driver profile not found" });
        }

        const ride = await db.getRideById(input.rideId);
        if (!ride || ride.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ride not available" });
        }

        await db.updateRideStatus(input.rideId, "accepted", driver.id);
        await db.updateDriverAvailability(driver.id, false);

        return { success: true };
      }),

    startRide: protectedProcedure
      .input(z.object({
        rideId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const driver = await db.getDriverByUserId(ctx.user.id);
        if (!driver) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Driver profile not found" });
        }

        const ride = await db.getRideById(input.rideId);
        if (!ride || ride.driverId !== driver.id || ride.status !== "accepted") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot start this ride" });
        }

        await db.updateRideStatus(input.rideId, "in_progress");
        return { success: true };
      }),

    completeRide: protectedProcedure
      .input(z.object({
        rideId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const driver = await db.getDriverByUserId(ctx.user.id);
        if (!driver) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Driver profile not found" });
        }

        const ride = await db.getRideById(input.rideId);
        if (!ride || ride.driverId !== driver.id || ride.status !== "in_progress") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot complete this ride" });
        }

        await db.updateRideStatus(input.rideId, "completed");
        await db.updateDriverAvailability(driver.id, true);

        return { success: true };
      }),

    getRideHistory: protectedProcedure.query(async ({ ctx }) => {
      const driver = await db.getDriverByUserId(ctx.user.id);
      if (!driver) {
        return [];
      }

      return await db.getDriverRides(driver.id);
    }),
  }),

  customer: router({
    requestRide: protectedProcedure
      .input(z.object({
        pickupLatitude: z.string(),
        pickupLongitude: z.string(),
        pickupAddress: z.string().optional(),
        dropoffLatitude: z.string().optional(),
        dropoffLongitude: z.string().optional(),
        dropoffAddress: z.string().optional(),
        isShared: z.boolean().default(false),
        maxPassengers: z.number().min(1).max(4).default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // Calculate estimated distance and fare
        let estimatedDistance = 0;
        let baseFare = 500; // Default base fare in cents
        
        if (input.dropoffLatitude && input.dropoffLongitude) {
          estimatedDistance = Math.round(calculateDistance(
            parseFloat(input.pickupLatitude),
            parseFloat(input.pickupLongitude),
            parseFloat(input.dropoffLatitude),
            parseFloat(input.dropoffLongitude)
          ));
          baseFare = calculateFare(estimatedDistance, input.isShared ? input.maxPassengers : 1);
        }

        await db.createRide({
          customerId: ctx.user.id,
          pickupLatitude: input.pickupLatitude,
          pickupLongitude: input.pickupLongitude,
          pickupAddress: input.pickupAddress,
          dropoffLatitude: input.dropoffLatitude,
          dropoffLongitude: input.dropoffLongitude,
          dropoffAddress: input.dropoffAddress,
          isShared: input.isShared,
          maxPassengers: input.maxPassengers,
          currentPassengers: 1,
          baseFare,
          totalFare: baseFare,
          farePerPassenger: baseFare,
          estimatedDistance,
        });

        return { success: true };
      }),

    joinSharedRide: protectedProcedure
      .input(z.object({
        rideId: z.number(),
        pickupLatitude: z.string(),
        pickupLongitude: z.string(),
        pickupAddress: z.string().optional(),
        dropoffLatitude: z.string().optional(),
        dropoffLongitude: z.string().optional(),
        dropoffAddress: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        
        if (!ride || !ride.isShared) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Shared ride not found" });
        }

        if (ride.currentPassengers >= ride.maxPassengers) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ride is full" });
        }

        if (ride.status !== "pending" && ride.status !== "accepted") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ride is not available for joining" });
        }

        // Calculate fare share
        const newPassengerCount = ride.currentPassengers + 1;
        const farePerPassenger = Math.round(ride.baseFare / newPassengerCount);

        await db.addRidePassenger({
          rideId: input.rideId,
          customerId: ctx.user.id,
          pickupLatitude: input.pickupLatitude,
          pickupLongitude: input.pickupLongitude,
          pickupAddress: input.pickupAddress,
          dropoffLatitude: input.dropoffLatitude,
          dropoffLongitude: input.dropoffLongitude,
          dropoffAddress: input.dropoffAddress,
          fareShare: farePerPassenger,
        });

        return { success: true };
      }),

    getAvailableSharedRides: protectedProcedure
      .input(z.object({
        pickupLatitude: z.string(),
        pickupLongitude: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getAvailableSharedRides(input.pickupLatitude, input.pickupLongitude);
      }),

    getRideHistory: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCustomerRides(ctx.user.id);
    }),

    cancelRide: protectedProcedure
      .input(z.object({
        rideId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        
        if (!ride || ride.customerId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Ride not found" });
        }

        if (ride.status === "completed" || ride.status === "cancelled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel this ride" });
        }

        await db.updateRideStatus(input.rideId, "cancelled");

        // If driver was assigned, make them available again
        if (ride.driverId) {
          await db.updateDriverAvailability(ride.driverId, true);
        }

        return { success: true };
      }),

    rateDriver: protectedProcedure
      .input(z.object({
        rideId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        
        if (!ride || ride.customerId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Ride not found" });
        }

        if (ride.status !== "completed" || !ride.driverId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot rate this ride" });
        }

        await db.createRating({
          rideId: input.rideId,
          driverId: ride.driverId,
          customerId: ctx.user.id,
          rating: input.rating,
          comment: input.comment,
        });

        return { success: true };
      }),
  }),

  rides: router({
    getNearestDrivers: protectedProcedure
      .input(z.object({
        latitude: z.string(),
        longitude: z.string(),
        limit: z.number().default(5),
      }))
      .query(async ({ ctx, input }) => {
        const drivers = await db.getAvailableDrivers();
        
        const driversWithDistance = drivers
          .filter(d => d.currentLatitude && d.currentLongitude)
          .map(driver => {
            const distance = calculateDistance(
              parseFloat(input.latitude),
              parseFloat(input.longitude),
              parseFloat(driver.currentLatitude!),
              parseFloat(driver.currentLongitude!)
            );
            return { ...driver, distance };
          })
          .sort((a, b) => a.distance - b.distance)
          .slice(0, input.limit);

        return driversWithDistance;
      }),
  }),
});

export type AppRouter = typeof appRouter;
