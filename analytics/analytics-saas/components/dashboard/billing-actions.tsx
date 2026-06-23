"use client";

import { useState } from "react";

interface BillingActionsProps {
  mode: "active" | "inactive";
}

export function BillingActions({ mode }: BillingActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        return;
      }
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      alert(`Failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        return;
      }
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      alert(`Failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (mode === "active") {
    return (
      <button
        onClick={handleManageBilling}
        disabled={loading}
        className="mt-6 px-4 py-2 rounded-lg bg-color-brand text-white font-medium hover:bg-color-brand-dark transition-colors w-full disabled:opacity-50"
      >
        {loading ? "Loading..." : "Manage Billing"}
      </button>
    );
  }

  return (
    <button
      onClick={handleStartTrial}
      disabled={loading}
      className="px-4 py-2 rounded-lg bg-color-brand text-white font-medium hover:bg-color-brand-dark transition-colors disabled:opacity-50"
    >
      {loading ? "Loading..." : "Start Free Trial"}
    </button>
  );
}
