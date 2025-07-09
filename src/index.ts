import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { authController } from "./services/auth";
import { bookingController } from "./services/booking/controller";
import { hotelController } from "./services/hotel";
import { roomController } from "./services/room";
import swagger from "@elysiajs/swagger";

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
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
