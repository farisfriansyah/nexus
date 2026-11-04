import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL belum diatur");
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionString) });
  }
  return globalForPrisma.prisma;
}
