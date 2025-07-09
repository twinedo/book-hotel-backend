import type { JWTOption } from "@elysiajs/jwt";

export const jwtProps: JWTOption = {
  name: "jwt",
  secret: `${process.env.JWT_SECRET}`,
  exp: "1d",
  alg: 'HS256',
};
