import { redirect } from "next/navigation";

// The weekly grid now lives as a panel inside the workspace.
export default function WeekPage() {
  redirect("/workspace");
}
