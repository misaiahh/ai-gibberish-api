import { db } from "../server/db";
import { seedDatabase } from "../server/lib/seed";

try {
  const count = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

  if (count.count > 0) {
    console.log(`Database already has ${count.count} user(s). Skipping seed.`);
  } else {
    seedDatabase();
    console.log("Database seeded with demo data.");
  }
} finally {
  db.close();
}
