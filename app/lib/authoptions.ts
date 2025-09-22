import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { Session, User } from "next-auth";

interface CustomUser extends User {
  avatarUrl?: string;
  passwordHash?: string
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "Enter your Email",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Enter your password",
        },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const { email, password } = credentials;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          console.log("User not found");
          return null;
        }

        if (!user.passwordHash) {
          console.log("User password is missing");
          return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          console.log("Invalid password");
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        } as CustomUser;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      async profile(profile) {
        let user = await prisma.user.findUnique({
          where: { email: profile.email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              name: profile.name,
              username: profile.username,
              email: profile.email,
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        } as CustomUser;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    jwt: ({ token, user }: { token: JWT; user?: CustomUser }) => {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = user.avatarUrl ?? null;
      }
      return token;
    },
    session: ({ session, token }: { session: Session; token: JWT }) => {
      if (session && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
      }
      return session;
    },
  },
};
