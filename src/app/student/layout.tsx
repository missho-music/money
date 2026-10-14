import { redirect } from "next/navigation";
import { StudentShell } from "@/components/student-shell";
import { getActor } from "@/server/session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "student") redirect("/teacher");
  return <StudentShell actor={actor}>{children}</StudentShell>;
}
