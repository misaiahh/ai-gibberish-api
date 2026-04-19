import { db } from "../../db";

// DELETE /api/todos/:id — delete a todo
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  const todo = db
    .prepare("SELECT * FROM todos WHERE id = ?")
    .get(id) as { id: string } | undefined;

  if (!todo) {
    throw createError({ statusCode: 404, statusMessage: "Todo not found" });
  }

  db.prepare("DELETE FROM todos WHERE id = ?").run(id);

  return { id };
});
