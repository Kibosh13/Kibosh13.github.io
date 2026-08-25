import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
