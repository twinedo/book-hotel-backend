import { Elysia, t } from "elysia";
import { prisma } from "prisma/client";

export const bookingController = new Elysia({ prefix: "/bookings" })
  // Create a new booking (available for guests and registered users)
  .post(
    "/",
    async ({ body, set }) => {
      const {
        hotelId,
        roomId,
        email,
        checkIn,
        checkOut,
        fullName,
        phoneNumber,
        paymentMethod,
        paymentAccountNumber,
        notes,
      } = body;

      // Check room availability count first
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: {
          totalCount: true,
          _count: {
            select: {
              Booking: {
                where: {
                  status: { not: "CANCELLED" },
                  OR: [
                    {
                      checkIn: { lt: new Date(checkOut) },
                      checkOut: { gt: new Date(checkIn) },
                    },
                    {
                      checkIn: {
                        gte: new Date(checkIn),
                        lte: new Date(checkOut),
                      },
                    },
                  ],
                },
              },
            },
          },
          price: true,
          hotel: true,
        },
      });

      if (!room) {
        set.status = 404;
        return { error: "Room not found" };
      }

      const availableSlots = room.totalCount - room._count.Booking;
      if (availableSlots <= 0) {
        set.status = 400;
        return {
          error: "No available slots for this room type",
          availableSlots,
        };
      }

      // Calculate total price based on nights
      const nights = Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const totalPrice = room.price * nights;

      // Find user by email if exists
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Create booking in a transaction
      const booking = await prisma.$transaction(async (tx) => {
        // 1. Create the booking
        const newBooking = await tx.booking.create({
          data: {
            hotelId,
            roomId,
            userId: user?.id,
            guestEmail: email,
            guestName: fullName,
            guestPhone: phoneNumber,
            paymentMethod,
            paymentAccountNumber,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            totalPrice,
            status: "CONFIRMED",
            notes,
          },
          include: {
            hotel: true,
            room: true,
          },
        });

        // Note: We're not updating bookedCount here since we're querying actual bookings
        // for availability, but you could add it if you want to cache the count

        return newBooking;
      });

      set.status = 201;
      return {
        success: true,
        booking,
        availableSlots: availableSlots - 1,
        message: "Booking created successfully",
      };
    },
    {
      body: t.Object({
        hotelId: t.String(),
        roomId: t.String(),
        email: t.String({ format: "email" }),
        fullName: t.String(),
        phoneNumber: t.String(),
        paymentMethod: t.Optional(t.String()),
        paymentAccountNumber: t.Optional(t.String()),
        checkIn: t.String({ format: "date-time" }),
        checkOut: t.String({ format: "date-time" }),
        notes: t.Optional(t.String()),
      }),
    }
  )

  // Get booking details by ID (available for guests and registered users)
  .get(
    "/:id",
    async ({ params: { id }, query: { email }, set }) => {
      const booking = await prisma.booking.findFirst({
        where: {
          id,
          OR: [{ guestEmail: email }, { user: { email } }],
        },
        include: {
          hotel: true,
          room: {
            include: {
              _count: {
                select: {
                  Booking: {
                    where: {
                      status: { not: "CANCELLED" },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!booking) {
        set.status = 404;
        return { error: "Booking not found or email mismatch" };
      }

      return {
        ...booking,
        room: {
          ...booking.room,
          availableSlots: booking.room.totalCount - booking.room._count.Booking,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        email: t.String({ format: "email" }),
      }),
    }
  )

  // Get all bookings by email (history)
  .get(
    "/history",
    async ({
      query,
    }: {
      query: { email: string; type?: "past" | "upcoming" | "all" };
    }) => {
      const now = new Date();

      const baseCondition = {
        OR: [{ guestEmail: query.email }, { user: { email: query.email } }],
      };

      const dateCondition =
        query.type === "past"
          ? { checkOut: { lt: now } } // Past bookings (check-out date passed)
          : query.type === "upcoming"
            ? { checkIn: { gt: now } } // Upcoming bookings (check-in date in future)
            : {}; // All bookings (no date filter)

      const bookings = await prisma.booking.findMany({
        where: {
          ...baseCondition,
          ...dateCondition,
        },
        include: {
          hotel: true,
          room: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        bookings,
        meta: {
          type: query.type || "all",
          currentDate: now.toISOString(),
        },
      };
    },
    {
      query: t.Object({
        email: t.String({ format: "email" }),
        type: t.Optional(
          t.Union([t.Literal("past"), t.Literal("upcoming"), t.Literal("all")])
        ),
      }),
    }
  )

  // Get booking confirmation
  .get(
    "/:id/confirmation",
    async ({ params, query }) => {
      const booking = await prisma.booking.findFirst({
        where: {
          id: params.id,
          OR: [{ guestEmail: query.email }, { user: { email: query.email } }],
        },
        include: {
          hotel: true,
          room: {
            include: {
              _count: {
                select: {
                  Booking: {
                    where: {
                      status: { not: "CANCELLED" },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      return {
        confirmationNumber: booking.id,
        hotelName: booking.hotel.name,
        roomType: booking.room.type,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalPrice: booking.totalPrice,
        status: booking.status,
        availableSlots: booking.room.totalCount - booking.room._count.Booking,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ email: t.String({ format: "email" }) }),
    }
  )

  // Cancel a booking
  .patch(
    "/:id/cancel",
    async ({ params: { id }, query: { email }, set }) => {
      const booking = await prisma.booking.findFirst({
        where: {
          id,
          OR: [{ guestEmail: email }, { user: { email } }],
          status: { not: "CANCELLED" },
        },
      });

      if (!booking) {
        set.status = 404;
        return { error: "Booking not found or already cancelled" };
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: {
          hotel: true,
          room: true,
        },
      });

      return {
        success: true,
        booking: updatedBooking,
        message: "Booking cancelled successfully",
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        email: t.String({ format: "email" }),
      }),
    }
  )

  .get("/admin/all", async () => {
    const bookings = await prisma.booking.findMany({
      include: {
        hotel: true,
        room: {
          include: {
            _count: {
              select: {
                Booking: {
                  where: {
                    status: { not: "CANCELLED" },
                  },
                },
              },
            },
          },
        },
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      bookings: bookings.map((b) => ({
        ...b,
        room: {
          ...b.room,
          availableSlots: b.room.totalCount - b.room._count.Booking,
        },
      })),
    };
  });
