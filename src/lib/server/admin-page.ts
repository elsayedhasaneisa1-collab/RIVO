import { redirect } from "next/navigation";
import { hasPermission, type Permission } from "@/lib/constants";
import { getAdminUser } from "./auth";

export async function guardPage(permission?: Permission) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  if (permission && !hasPermission(user.role, permission)) redirect("/admin");
  return user;
}
