import { Elysia, t, type Context } from "elysia";
import { loginUser, registerUser } from "./model";
import jwt from "@elysiajs/jwt";
import type { RegisterInput } from "./types";

export const authController = new Elysia({ prefix: "/auth" })
    .post(
      "/register",
      async ({ body, set } : {body: RegisterInput, set: Context['set']}) => {
        try {
          const user = await registerUser(body);
          set.status = 201;
          return {
            status: 201,
            message: "User registered successfully",
            data: {
              email: user.email,
              fullName: user.fullName
            },
          };
        } catch (error) {
          set.status = 400;
          console.log("error", error);
          return {
            status: 400,
            message: "Registration failed",
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      {
        body: t.Object({
          email: t.String({ format: "email" }),
          fullName: t.String(),
          password: t.String({ minLength: 8 }),
        }),
      }
    )
  .use(
    jwt({
      name: "jwt",
      secret: "Fischl von Luftschloss Narfidort",
    })
  )
  .post(
    "/login",
    async ({ jwt, body, set }) => {
      try {
        const { user } = await loginUser(body.email, body.password);
        console.log('user', user)
        const token = await jwt.sign({
          ...user,
          id: user.id ?? "",
          fullName: user.fullName ?? 'User',
        })
        set.status = 200;
        return {
          status: 200,
          message: "Login successful",
          data: { user, token },
        };
      } catch (error) {
        set.status = 401;
        return {
          status: 401,
          message: "Login failed",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  );
//   .delete(
//     "/:id",
//     async ({ params: { id }, set }) => {
//       try {
//         const data = await deleteUser(id);
//         set.status = 200;
//         return {
//           status: 200,
//           message: "User deleted successfully",
//           data,
//         };
//       } catch (error) {
//         set.status = 500;
//         return {
//           status: 500,
//           message: "Failed to delete user",
//           error: error instanceof Error ? error.message : String(error),
//         };
//       }
//     },
//     {
//       params: t.Object({
//         id: t.String(),
//       }),
//     }
//   );
