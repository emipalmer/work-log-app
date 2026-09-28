import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import NavRail from "@/components/NavRail";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <NavRail email={user.email} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
