import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { authController } from "./services/auth";
import { bookingController } from "./services/booking/controller";
import { hotelController } from "./services/hotel";
import { roomController } from "./services/room";
import swagger from "@elysiajs/swagger";

const DOMAIN = process.env.NODE_ENV === 'production' 
  ? 'https://book-hotel-backend.zeabur.app' 
  : `http://localhost:${process.env.PORT || 8080}`;

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      path: '/swagger',
      documentation: {
        servers: [{ url: DOMAIN }],
        info: {
          title: "Booking Hotel API",
          version: "1.0.0",
        },
      },
    })
  )
  .get("/", () => "Hello Elysia")
  .use(authController)
  .use(bookingController)
  .use(hotelController)
  .use(roomController)

  .listen(process.env.PORT ?? 8080);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
