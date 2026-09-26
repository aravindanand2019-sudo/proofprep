// PATCH { status }: tick a roadmap task done or reopen it.
import { z } from "zod";
import { updateTask } from "@/lib/data";
import { TaskStatusSchema } from "@/lib/schemas";
import { parseBody, withUser } from "@/lib/server/api";

const Body = z.object({ status: TaskStatusSchema });

export async function PATCH(request: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params;
  return withUser(async (uid) => {
    const { status } = await parseBody(request, Body);
    await updateTask(uid, taskId, { status });
    return { ok: true };
  });
}
