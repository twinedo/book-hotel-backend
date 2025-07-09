// apps/backend/src/services/hotel.ts
import { Elysia, t, type Context } from "elysia";
import { prisma } from "prisma/client";
import type { CreateHotelDto, CreateRoomDto, UpdateHotelDto } from "./types";

export const hotelController = new Elysia({ prefix: "/hotels" })
  // Create Hotel (Admin only)
  .post(
    "/",
    async ({ body, set }: { body: CreateHotelDto; set: Context["set"] }) => {
      try {
        const hotel = await prisma.hotel.create({
          data: {
            name: body.name,
            description: body.description,
            address: body.address,
            city: body.city,
            price: body.price,
            classHotel: body.classHotel,
            facilities: body.facilities,
            images: body.images,
          },
        });
        return hotel;
      } catch (error) {
        set.status = 400;
        return { error: "Failed to create hotel" };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.String(),
        address: t.String(),
        city: t.String(),
        price: t.Number(),
        classHotel: t.Number(),
        facilities: t.String(),
        images: t.String(),
      }),
    }
  )

  // Get All Hotels
  .get("/", async ({ query }) => {
    const { city, minPrice, maxPrice, classHotel } = query;

    const hotels = await prisma.hotel.findMany({
      where: {
        city: city ? { contains: city } : undefined,
        price: {
          gte: minPrice ? Number(minPrice) : undefined,
          lte: maxPrice ? Number(maxPrice) : undefined,
        },
        classHotel: classHotel ? Number(classHotel) : undefined,
      },
      include: {
        rooms: true,
      },
    });

    return hotels;
  })

  // Get Single Hotel
  .get(
    "/:id",
    async ({ params }) => {
      const hotel = await prisma.hotel.findUnique({
        where: { id: params.id },
        include: {
          rooms: true,
          Booking: true,
        },
      });

      if (!hotel) {
        throw new Error("Hotel not found");
      }

      return hotel;
    },
    {
      query: t.Object({
        city: t.Optional(t.String()),
        minPrice: t.Optional(t.String()),
        maxPrice: t.Optional(t.String()),
        classHotel: t.Optional(t.String()),
      }),
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Update Hotel (Admin only)
  .put(
    "/:id",
    async ({
      params,
      body,
    }: {
      params: { id: string };
      body: UpdateHotelDto;
    }) => {
      const updatedHotel = await prisma.hotel.update({
        where: { id: params.id },
        data: {
          name: body.name,
          description: body.description,
          address: body.address,
          city: body.city,
          price: body.price,
          classHotel: body.classHotel,
          facilities: body.facilities,
          images: body.images,
        },
      });

      return updatedHotel;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.String(),
        description: t.String(),
        address: t.String(),
        city: t.String(),
        price: t.Number(),
        classHotel: t.Number(),
        facilities: t.String(),
        images: t.String(),
      }),
    }
  )

  // Delete Hotel (Admin only)
  .delete(
    "/:id",
    async ({ params }) => {
      await prisma.hotel.delete({
        where: { id: params.id },
      });

      return { message: "Hotel deleted successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Add Room to Hotel (Admin only)
  .post(
    "/:id/rooms",
    async ({
      params,
      body,
    }: {
      params: { id: string };
      body: CreateRoomDto;
    }) => {
      const room = await prisma.room.create({
        data: {
          type: body.type,
          description: body.description,
          price: body.price,
          capacity: body.capacity,
          facilities: body.facilities,
          hotelId: params.id,
          refundable: body.refundable,
        },
      });

      return room;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        type: t.String(),
        description: t.String(),
        price: t.Number(),
        capacity: t.Number(),
        facilities: t.String(),
        refundable: t.Boolean(),
      }),
    }
  );
