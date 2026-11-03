import type { NextRequest } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AdminUser } from "./auth";
import { getClientIp } from "./security";

export async function logAudit(params: {
  user: AdminUser | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details?: Record<string, unknown>;
  req?: NextRequest;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.user?.id ?? null,
      userEmail: params.user?.email ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId != null ? String(params.entityId) : null,
      details: params.details ?? null,
      ip: params.req ? getClientIp(params.req) : null,
    });
  } catch (e) {
    console.error("audit_failed", e);
  }
}
