"use client";

import { useState } from "react";
import { ConfigForm } from "@/components/dashboard/config-form";
import { DeleteConfigButton } from "@/components/dashboard/delete-config-button";
import { reportConfigs } from "@/lib/db/schema";

type Config = typeof reportConfigs.$inferSelect;

interface PropertiesPageContentProps {
  initialConfigs: Config[];
  defaultEmail: string;
}

export function PropertiesPageContent({
  initialConfigs,
  defaultEmail,
}: PropertiesPageContentProps) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);

  const handleClose = () => {
    setShowForm(false);
    setEditingConfig(null);
  };

  const handleSuccess = async () => {
    // Refetch configs from server
    const response = await fetch("/api/configs");
    if (response.ok) {
      const data = await response.json();
      setConfigs(data);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Properties</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark transition-colors"
        >
          Add Property
        </button>
      </div>

      {showForm || editingConfig ? (
        <div className="rounded-lg border border-border bg-card p-6 mb-8 max-w-2xl">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {editingConfig ? "Edit Property" : "Add New Property"}
          </h2>
          <ConfigForm
            config={editingConfig ?? undefined}
            defaultEmail={defaultEmail}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        </div>
      ) : null}

      {configs.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground mb-4">No properties yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-brand hover:underline font-medium"
          >
            Add your first property
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <div
              key={config.id}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {config.gscSiteUrl}
                  </h3>
                  <dl className="mt-4 space-y-2 text-sm">
                    {config.ga4PropertyId && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-muted-foreground">GA4 ID:</dt>
                        <dd className="font-mono text-foreground">{config.ga4PropertyId}</dd>
                      </div>
                    )}
                    {config.gscSiteUrl && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-muted-foreground">GSC URL:</dt>
                        <dd className="font-mono text-foreground">{config.gscSiteUrl}</dd>
                      </div>
                    )}
                    {config.gbpLocationId && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-muted-foreground">GBP ID:</dt>
                        <dd className="font-mono text-foreground">{config.gbpLocationId}</dd>
                      </div>
                    )}
                    {config.recipientEmail && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-muted-foreground">Email:</dt>
                        <dd className="text-foreground">{config.recipientEmail}</dd>
                      </div>
                    )}
                    {config.recipientPhone && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-muted-foreground">Phone:</dt>
                        <dd className="text-foreground">{config.recipientPhone}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div className="text-right flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(config.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingConfig(config)}
                      className="text-brand hover:underline font-medium text-sm"
                    >
                      Edit
                    </button>
                    <DeleteConfigButton id={config.id} businessName={config.businessName} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
