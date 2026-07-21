import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import NavRail from "@/components/NavRail";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <NavRail email={user.email} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
