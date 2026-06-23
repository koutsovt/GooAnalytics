import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function SettingsPage() {
  const userId = await requireSession();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return (
    <div>
      <h1 className="text-4xl font-bold text-color-foreground mb-8">Settings</h1>

      <div className="rounded-lg border border-color-border bg-color-input p-6 max-w-md">
        <h2 className="text-2xl font-bold text-color-foreground mb-6">Account Information</h2>
        <dl className="space-y-5">
          <div>
            <dt className="text-base font-semibold text-color-foreground">Email</dt>
            <dd className="text-base text-color-foreground mt-1 font-medium">{user?.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-base font-semibold text-color-foreground">Name</dt>
            <dd className="text-base text-color-foreground mt-1 font-medium">{user?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-base font-semibold text-color-foreground">Member Since</dt>
            <dd className="text-base text-color-foreground mt-1 font-medium">
              {user?.createdAt?.toLocaleDateString() || "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
