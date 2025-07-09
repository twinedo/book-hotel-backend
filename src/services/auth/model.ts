import { prisma } from "prisma/client";

const SALT_ROUNDS = 10;

export const registerUser = async (data: {
  fullName: string;
  email: string;
  password: string;
}) => {
  const hashedPassword = await Bun.password.hash(data.password, {
    algorithm: "bcrypt",
    cost: SALT_ROUNDS,
  });
  return await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      password: hashedPassword,
    },
  });
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  const valid = await Bun.password.verify(password, user.password);
  if (!valid) throw new Error("Invalid password");

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    },
  };
};
