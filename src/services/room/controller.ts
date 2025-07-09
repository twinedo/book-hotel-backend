import { Elysia, t } from "elysia";
import { prisma } from "prisma/client";

// Predefined room types and facilities
const ROOM_TYPES = {
  JUNIOR: {
    name: "Junior Suite",
    facilities: ["Wifi", "AC", "Parking"],
    refundable: false,
  },
  DELUXE: {
    name: "Deluxe",
    facilities: ["Wifi", "AC", "Parking", "Breakfast"],
    refundable: true,
  },
  PREMIER: {
    name: "Premier",
    facilities: [
      "Wifi",
      "AC",
      "Parking",
      "Breakfast",
      "Discount Food & Beverage",
    ],
    refundable: true,
  },
};

export const roomController = new Elysia({ prefix: "/rooms" })
  // Create Room (with predefined types)
  .post(
    "/",
    async ({ body, set }) => {
      const { hotelId, type } = body;

      // Validate room type
      const roomType = ROOM_TYPES[type as keyof typeof ROOM_TYPES];
      if (!roomType) {
        set.status = 400;
        return { error: "Invalid room type" };
      }

      try {
        const room = await prisma.room.create({
          data: {
            type: roomType.name,
            description: body.description || `${roomType.name} room`,
            price: body.price,
            capacity: body.capacity || 2,
            facilities: roomType.facilities.join(", "),
            refundable: roomType.refundable,
            hotelId,
            totalCount: body.totalCount || 1,
          },
        });
        return room;
      } catch (error) {
        set.status = 400;
        return { error: "Failed to create room" };
      }
    },
    {
      body: t.Object({
        hotelId: t.String(),
        type: t.Union([
          t.Literal("JUNIOR"),
          t.Literal("DELUXE"),
          t.Literal("PREMIER"),
        ]),
        description: t.Optional(t.String()),
        price: t.Number(),
        capacity: t.Optional(t.Number()),
        totalCount: t.Optional(t.Number({ default: 1 })),
      }),
      detail: {
        summary: "Create a new room",
        description: "Create a new room with predefined types and facilities",
        tags: ["Admin"],
      },
    }
  )

  // Get All Rooms (with hotel filter)
  .get(
    "/",
    async ({ query }) => {
      const rooms = await prisma.room.findMany({
        where: {
          hotelId: query.hotelId || undefined,
          type: query.type || undefined,
        },
        include: {
          hotel: query.includeHotel === "true",
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
      });
      return rooms.map((room) => ({
        ...room,
        facilities: room.facilities.split(", "),
        availableSlots: room.totalCount - room._count.Booking,
      }));
    },
    {
      query: t.Object({
        hotelId: t.Optional(t.String()),
        type: t.Optional(t.String()),
        includeHotel: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get all rooms",
        description: "Get list of rooms with optional filters",
        tags: ["Public"],
      },
    }
  )

  // Get Room by ID
  .get(
    "/:id",
    async ({ params }) => {
      const room = await prisma.room.findUnique({
        where: { id: params.id },
        include: {
          hotel: true,
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
      });

      if (!room) {
        throw new Error("Room not found");
      }

      return {
        ...room,
        facilities: room.facilities.split(", "),
        availableSlots: room.totalCount - room._count.Booking,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get room details",
        description: "Get detailed information about a specific room",
        tags: ["Public"],
      },
    }
  )

  // Update Room (partial updates)
  .patch(
    "/:id",
    async ({ params, body }) => {
      // Only include fields that were actually provided in the request
      const updateData: {
        price?: number;
        description?: string;
        capacity?: number;
        totalCount?: number;
      } = {};

      if (body.price !== undefined) updateData.price = body.price;
      if (body.description !== undefined)
        updateData.description = body.description;
      if (body.capacity !== undefined) updateData.capacity = body.capacity;
      if (body.totalCount !== undefined)
        updateData.totalCount = body.totalCount;

      const updatedRoom = await prisma.room.update({
        where: { id: params.id },
        data: updateData,
      });

      return {
        ...updatedRoom,
        facilities: updatedRoom.facilities.split(", "),
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        price: t.Optional(t.Number()),
        description: t.Optional(t.String()),
        capacity: t.Optional(t.Number()),
        totalCount: t.Optional(t.Number()),
      }),
      detail: {
        summary: "Update room (partial)",
        description:
          "Partially update room information - only include fields you want to change",
        tags: ["Admin"],
      },
    }
  )
  // Delete Room
  .delete(
    "/:id",
    async ({ params }) => {
      await prisma.room.delete({
        where: { id: params.id },
      });

      return { message: "Room deleted successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Delete room",
        description: "Permanently delete a room",
        tags: ["Admin"],
      },
    }
  )

  // Get Available Rooms by Date
  .get(
    "/available",
    async ({ query }) => {
      const { checkIn, checkOut, hotelId } = query;

      const bookedRoomIds = await prisma.booking.findMany({
        where: {
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) },
            },
          ],
          hotelId,
          status: { not: "CANCELLED" },
        },
        select: { roomId: true },
      });

      const availableRooms = await prisma.room.findMany({
        where: {
          hotelId,
          id: { notIn: bookedRoomIds.map((b) => b.roomId) },
        },
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
      });

      return availableRooms.map((room) => ({
        ...room,
        facilities: room.facilities.split(", "),
        availableSlots: room.totalCount - room._count.Booking,
      }));
    },
    {
      query: t.Object({
        checkIn: t.String({ format: "date-time" }),
        checkOut: t.String({ format: "date-time" }),
        hotelId: t.String(),
      }),
      detail: {
        summary: "Get available rooms",
        description: "Get rooms available between specific dates",
        tags: ["Public"],
      },
    }
  );
