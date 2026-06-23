"use client";

import { useState } from "react";
import { ConfigForm } from "@/components/dashboard/config-form";
import { DeleteConfigButton } from "@/components/dashboard/delete-config-button";
import { reportConfigs } from "@/lib/db/schema";

type Config = typeof reportConfigs.$inferSelect;

interface PropertiesPageContentProps {
  initialConfigs: Config[];
}

export function PropertiesPageContent({ initialConfigs }: PropertiesPageContentProps) {
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
        <h1 className="text-3xl font-bold text-color-foreground">Properties</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg bg-color-brand text-white font-medium hover:bg-color-brand-dark transition-colors"
        >
          Add Property
        </button>
      </div>

      {showForm || editingConfig ? (
        <div className="rounded-lg border border-color-border bg-color-card p-6 mb-8 max-w-2xl">
          <h2 className="text-lg font-semibold text-color-foreground mb-4">
            {editingConfig ? "Edit Property" : "Add New Property"}
          </h2>
          <ConfigForm config={editingConfig ?? undefined} onClose={handleClose} onSuccess={handleSuccess} />
        </div>
      ) : null}

      {configs.length === 0 ? (
        <div className="rounded-lg border border-color-border bg-color-muted/30 p-8 text-center">
          <p className="text-color-muted-foreground mb-4">No properties yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-color-brand hover:underline font-medium"
          >
            Add your first property
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <div
              key={config.id}
              className="rounded-lg border border-color-border bg-color-card p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-color-foreground">
                    {config.gscSiteUrl}
                  </h3>
                  <dl className="mt-4 space-y-2 text-sm">
                    {config.ga4PropertyId && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-color-muted-foreground">GA4 ID:</dt>
                        <dd className="font-mono text-color-foreground">{config.ga4PropertyId}</dd>
                      </div>
                    )}
                    {config.gscSiteUrl && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-color-muted-foreground">GSC URL:</dt>
                        <dd className="font-mono text-color-foreground">{config.gscSiteUrl}</dd>
                      </div>
                    )}
                    {config.gbpLocationId && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-color-muted-foreground">GBP ID:</dt>
                        <dd className="font-mono text-color-foreground">{config.gbpLocationId}</dd>
                      </div>
                    )}
                    {config.recipientEmail && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-color-muted-foreground">Email:</dt>
                        <dd className="text-color-foreground">{config.recipientEmail}</dd>
                      </div>
                    )}
                    {config.recipientPhone && (
                      <div className="flex gap-4">
                        <dt className="font-medium text-color-muted-foreground">Phone:</dt>
                        <dd className="text-color-foreground">{config.recipientPhone}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div className="text-right flex flex-col gap-3">
                  <p className="text-sm text-color-muted-foreground">
                    Created {new Date(config.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingConfig(config)}
                      className="text-color-brand hover:underline font-medium text-sm"
                    >
                      Edit
                    </button>
                    <DeleteConfigButton id={config.id} businessName={config.gscSiteUrl} />
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
