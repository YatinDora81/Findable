import { db } from "../index.ts";

const user = await db.user.upsert({
  where: { id: "usr_demo" },
  update: {},
  create: { id: "usr_demo", email: "demo@local", name: "Demo" },
});

console.log(`seeded ${user.id}`);

await db.$disconnect();
