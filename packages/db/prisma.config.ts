import { defineConfig } from "prisma/config";

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error("Set DATABASE_URL, or DIRECT_DATABASE_URL for migrations");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
