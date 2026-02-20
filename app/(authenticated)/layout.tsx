import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth/session";
import { AuthProvider } from "@/src/components/providers/auth-provider";
import { Shell } from "@/src/components/ui/shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AuthProvider initialUser={user}>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
