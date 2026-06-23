CREATE TABLE "team_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"action" varchar(100) NOT NULL,
	"actor_id" text NOT NULL,
	"target_email" varchar(255),
	"target_member_id" text,
	"details" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_audit_logs" ADD CONSTRAINT "team_audit_logs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_audit_logs_owner_id_idx" ON "team_audit_logs" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "team_audit_logs_created_at_idx" ON "team_audit_logs" USING btree ("created_at");