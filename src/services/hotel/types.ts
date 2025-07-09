// apps/backend/src/types/hotel.ts
export type CreateHotelDto = {
  name: string
  description: string
  address: string
  city: string
  price: number
  classHotel: number
  facilities: string
  images: string
}

export type UpdateHotelDto = Partial<CreateHotelDto>

export type CreateRoomDto = {
  type: string
  description: string
  price: number
  capacity: number
  facilities: string
  refundable: boolean
}