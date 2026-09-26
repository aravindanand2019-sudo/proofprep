// Projects, interview sessions, mock interviews, roadmaps and tasks.
import {
  InterviewSessionSchema,
  MockInterviewSchema,
  ProjectSchema,
  RoadmapSchema,
  TaskSchema,
  type InterviewSession,
  type MockInterview,
  type Project,
  type Roadmap,
  type Task,
  type TaskStatus,
  type WithId,
} from "@/lib/schemas";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { readAll, readOne, userCollection, userDoc, writeMany } from "./base";

export function getProjects(uid: string): Promise<WithId<Project>[]> {
  return readAll(
    userCollection(uid, "projects").orderBy("analyzedAt", "desc").limit(50),
    ProjectSchema,
  );
}

export function getProject(uid: string, projectId: string): Promise<WithId<Project> | null> {
  return readOne(userCollection(uid, "projects").doc(projectId), ProjectSchema);
}

export async function saveProject(uid: string, project: Project, id?: string): Promise<string> {
  const [savedId] = await writeMany(userCollection(uid, "projects"), ProjectSchema, [
    { id, data: project },
  ]);
  return savedId ?? "";
}

export async function setProjectDefenseScore(
  uid: string,
  projectId: string,
  defenseScore: number,
): Promise<void> {
  await userCollection(uid, "projects").doc(projectId).update({ defenseScore });
}

export async function saveInterviewSession(
  uid: string,
  session: InterviewSession,
  id?: string,
): Promise<string> {
  const [savedId] = await writeMany(
    userCollection(uid, "interviewSessions"),
    InterviewSessionSchema,
    [{ id, data: session }],
  );
  return savedId ?? "";
}

export function getInterviewSession(
  uid: string,
  id: string,
): Promise<WithId<InterviewSession> | null> {
  return readOne(userCollection(uid, "interviewSessions").doc(id), InterviewSessionSchema);
}

export function getInterviewSessions(uid: string): Promise<WithId<InterviewSession>[]> {
  return readAll(
    userCollection(uid, "interviewSessions").orderBy("createdAt", "desc").limit(50),
    InterviewSessionSchema,
  );
}

export async function saveMockInterview(uid: string, interview: MockInterview): Promise<string> {
  const [id] = await writeMany(userCollection(uid, "mockInterviews"), MockInterviewSchema, [
    { data: interview },
  ]);
  return id ?? "";
}

export function getMockInterviews(uid: string): Promise<WithId<MockInterview>[]> {
  return readAll(
    userCollection(uid, "mockInterviews").orderBy("createdAt", "desc").limit(20),
    MockInterviewSchema,
  );
}

/** Writes a roadmap and its tasks, archives the previous open tasks, and activates it. */
export async function saveRoadmap(
  uid: string,
  roadmap: Roadmap,
  tasks: Array<Omit<Task, "roadmapId">>,
): Promise<{ roadmapId: string; taskIds: string[] }> {
  const roadmapRef = userCollection(uid, "roadmaps").doc();
  const taskCol = userCollection(uid, "tasks");
  const taskRefs = tasks.map(() => taskCol.doc());

  const weeks = roadmap.weeks.map((w) => ({ ...w, taskIds: [] as string[] }));
  tasks.forEach((task, i) => {
    const weekIndex = Math.min(
      weeks.length - 1,
      Math.max(
        0,
        Math.floor((task.dueDate.getTime() - roadmap.generatedAt.getTime()) / (7 * 864e5)),
      ),
    );
    const ref = taskRefs[i];
    if (ref && weeks[weekIndex]) weeks[weekIndex].taskIds.push(ref.id);
  });

  const open = await taskCol.where("status", "==", "todo").get();
  const batch = getAdminDb().batch();
  for (const doc of open.docs) batch.update(doc.ref, { status: "skipped" });
  batch.set(roadmapRef, RoadmapSchema.parse({ ...roadmap, weeks }));
  tasks.forEach((task, i) => {
    const ref = taskRefs[i];
    if (ref) batch.set(ref, TaskSchema.parse({ ...task, roadmapId: roadmapRef.id }));
  });
  batch.update(userDoc(uid), { activeRoadmapId: roadmapRef.id });
  await batch.commit();
  return { roadmapId: roadmapRef.id, taskIds: taskRefs.map((r) => r.id) };
}

export async function getActiveRoadmap(
  uid: string,
  roadmapId: string | undefined,
): Promise<{ roadmap: WithId<Roadmap>; tasks: WithId<Task>[] } | null> {
  if (!roadmapId) return null;
  const roadmap = await readOne(userCollection(uid, "roadmaps").doc(roadmapId), RoadmapSchema);
  if (!roadmap) return null;
  const tasks = await readAll(
    userCollection(uid, "tasks").where("roadmapId", "==", roadmapId),
    TaskSchema,
  );
  tasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return { roadmap, tasks };
}

export async function updateTask(
  uid: string,
  taskId: string,
  patch: { status: TaskStatus },
): Promise<void> {
  await userCollection(uid, "tasks")
    .doc(taskId)
    .update({
      status: patch.status,
      completedAt: patch.status === "done" ? new Date() : FieldValue.delete(),
    });
}
