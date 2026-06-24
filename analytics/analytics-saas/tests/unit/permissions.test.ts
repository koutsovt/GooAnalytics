import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  canDeleteConfig,
  canEditConfig,
  canManageTeam,
  canViewConfig,
  getUserRole,
  resolveOwner,
} from "@/lib/auth/permissions";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      teamMembers: {
        findFirst: vi.fn(),
      },
    },
  },
}));

describe("permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveOwner", () => {
    it("returns userId if user is not a team member", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(undefined);

      const result = await resolveOwner("user1");

      expect(result).toBe("user1");
    });

    it("returns ownerId if user is a team member", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "mem_1",
        ownerId: "owner1",
        memberId: "user1",
        role: "viewer",
        createdAt: new Date(),
      });

      const result = await resolveOwner("user1");

      expect(result).toBe("owner1");
    });
  });

  describe("getUserRole", () => {
    it("returns 'owner' if userId equals ownerId", async () => {
      const result = await getUserRole("user1", "user1");
      expect(result).toBe("owner");
    });

    it("returns role if user is a team member", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "mem_1",
        ownerId: "owner1",
        memberId: "user1",
        role: "editor",
        createdAt: new Date(),
      });

      const result = await getUserRole("user1", "owner1");

      expect(result).toBe("editor");
    });

    it("returns 'viewer' if user is not a member of the team", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(undefined);

      const result = await getUserRole("user1", "owner1");

      expect(result).toBe("viewer");
    });
  });

  describe("canManageTeam", () => {
    it("returns true if userId is the owner", async () => {
      const result = await canManageTeam("user1", "user1");
      expect(result).toBe(true);
    });

    it("returns false if userId is not the owner", async () => {
      const result = await canManageTeam("user1", "owner1");
      expect(result).toBe(false);
    });
  });

  describe("canEditConfig", () => {
    it("returns true if user is the config owner", async () => {
      const result = await canEditConfig("user1", "user1");
      expect(result).toBe(true);
    });

    it("returns true if user is an editor of the owner's team", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "mem_1",
        ownerId: "owner1",
        memberId: "user1",
        role: "editor",
        createdAt: new Date(),
      });

      const result = await canEditConfig("user1", "owner1");

      expect(result).toBe(true);
    });

    it("returns true if user is an admin of the owner's team", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "mem_1",
        ownerId: "owner1",
        memberId: "user1",
        role: "admin",
        createdAt: new Date(),
      });

      const result = await canEditConfig("user1", "owner1");

      expect(result).toBe(true);
    });

    it("returns false if user is a viewer of the owner's team", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "mem_1",
        ownerId: "owner1",
        memberId: "user1",
        role: "viewer",
        createdAt: new Date(),
      });

      const result = await canEditConfig("user1", "owner1");

      expect(result).toBe(false);
    });

    it("returns false if user is not a member of the team", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(undefined);

      const result = await canEditConfig("user1", "owner1");

      expect(result).toBe(false);
    });
  });

  describe("canViewConfig", () => {
    it("returns true if user is the config owner", async () => {
      const result = await canViewConfig("user1", "user1");
      expect(result).toBe(true);
    });

    it("returns true if user is a member of the owner's team", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "mem_1",
        ownerId: "owner1",
        memberId: "user1",
        role: "viewer",
        createdAt: new Date(),
      });

      const result = await canViewConfig("user1", "owner1");

      expect(result).toBe(true);
    });

    it("returns false if user is not a member of the team", async () => {
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(undefined);

      const result = await canViewConfig("user1", "owner1");

      expect(result).toBe(false);
    });
  });

  describe("canDeleteConfig", () => {
    it("returns true if user is the config owner", async () => {
      const result = await canDeleteConfig("user1", "user1");
      expect(result).toBe(true);
    });

    it("returns false if user is not the config owner", async () => {
      const result = await canDeleteConfig("user1", "owner1");
      expect(result).toBe(false);
    });
  });
});
