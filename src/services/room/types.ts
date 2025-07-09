// apps/backend/src/types/room.ts
export type CreateRoomDto = {
  hotelId: string
  type: 'JUNIOR' | 'DELUXE' | 'PREMIER'
  price: number
  capacity?: number
  description?: string
}

export type UpdateRoomDto = {
  price?: number
  capacity?: number
  description?: string
}

export type RoomResponse = {
  id: string
  type: string
  description: string
  price: number
  capacity: number
  facilities: string[]
  refundable: boolean
  hotelId: string
}