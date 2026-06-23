import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportConfigs, teamMembers } from "@/lib/db/schema";

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

/**
 * Resolve the owner for a given user.
 * If the user is a team member, returns their owner's ID.
 * Otherwise returns the user's own ID.
 */
export async function resolveOwner(userId: string): Promise<string> {
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.memberId, userId),
  });
  return membership?.ownerId ?? userId;
}

/**
 * Get the user's role in a team.
 * Returns "owner" if the user is the owner, or their role if they're a member.
 */
export async function getUserRole(userId: string, ownerId: string): Promise<TeamRole> {
  if (userId === ownerId) return "owner";

  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.memberId, userId),
  });

  if (membership?.ownerId === ownerId) {
    return (membership.role as TeamRole) || "viewer";
  }

  return "viewer"; // No access
}

/**
 * Check if a user can manage the team (invite, remove members, change roles).
 * Only owners and admins can manage the team.
 */
export async function canManageTeam(userId: string, ownerId: string): Promise<boolean> {
  if (userId === ownerId) return true;

  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.memberId, userId),
  });

  return membership?.ownerId === ownerId && membership.role === "admin";
}

/**
 * Check if a user can edit a config.
 * Owners can edit. Editors with matching owner can edit.
 * Viewers can only read (via canViewConfig).
 */
export async function canEditConfig(userId: string, configOwnerId: string): Promise<boolean> {
  if (userId === configOwnerId) return true;

  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.memberId, userId),
  });

  if (membership?.ownerId === configOwnerId) {
    return membership.role === "admin" || membership.role === "editor";
  }

  return false;
}

/**
 * Check if a user can view a config.
 * Owners can view. Team members with matching owner can view.
 */
export async function canViewConfig(userId: string, configOwnerId: string): Promise<boolean> {
  if (userId === configOwnerId) return true;

  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.memberId, userId),
  });

  return membership?.ownerId === configOwnerId;
}

/**
 * Check if a user can delete a config.
 * Only owners can delete.
 */
export async function canDeleteConfig(userId: string, configOwnerId: string): Promise<boolean> {
  return userId === configOwnerId;
}

/**
 * Check if a user can access billing settings.
 * Only owners can access billing.
 */
export async function canAccessBilling(userId: string, ownerId: string): Promise<boolean> {
  return userId === ownerId;
}

/**
 * Check if a user can manage properties.
 * Owners can manage. Editors with matching owner can manage.
 */
export async function canManageProperties(userId: string, ownerId: string): Promise<boolean> {
  if (userId === ownerId) return true;

  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.memberId, userId),
  });

  if (membership?.ownerId === ownerId) {
    return membership.role === "admin" || membership.role === "editor";
  }

  return false;
}
