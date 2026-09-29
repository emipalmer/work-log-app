import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getWorkspaceState } from "@/lib/workspace";
import WorkspaceClient from "@/components/workspace/WorkspaceClient";

// Layout is read on the server so the workspace renders in its saved
// arrangement immediately, with no default-layout flash on load.
export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { current, presets } = getWorkspaceState(user.id);
  return <WorkspaceClient initialLayout={current} initialPresets={presets} />;
}
