import { Elysia } from "elysia";
import bearer from "@elysiajs/bearer";
import jwt from "@elysiajs/jwt";
import { jwtProps } from "../../utils/const";

const authMiddleware = () => {
  return new Elysia()
    .use(bearer())
    .use(jwt(jwtProps))
    .onBeforeHandle(async ({ bearer, set, jwt }) => {
      console.log("bearer", bearer);
      const user = await jwt.verify(bearer || "");
      console.log("usersa", user);

      // if (user)

      if (!bearer) {
        set.status = 401;
        throw new Error("Bearer token is required");
      }

      if (typeof bearer !== "string") {
        set.status = 401;
        throw new Error("Invalid bearer token format");
      }

      return { bearer }; // Pass the bearer token to the next handler
    });
};

export { authMiddleware };