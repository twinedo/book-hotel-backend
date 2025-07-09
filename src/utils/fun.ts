import { prisma } from "prisma/client";

// utils/roomAvailability.ts
export async function checkRoomAvailability(roomId: string, quantity: number = 1) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      totalCount: true,
      bookedCount: true,
      Booking: {
        where: {
          status: { notIn: ['CANCELLED', 'COMPLETED'] }
        },
        select: { id: true }
      }
    }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const availableSlots = room.totalCount - room.bookedCount;
  return {
    isAvailable: availableSlots >= quantity,
    availableSlots,
    totalCount: room.totalCount,
    bookedCount: room.bookedCount
  };
}