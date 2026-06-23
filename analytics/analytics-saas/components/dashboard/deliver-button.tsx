"use client";

import { useState } from "react";

interface DeliverButtonProps {
  reportId: string;
}

export function DeliverButton({ reportId }: DeliverButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDeliver = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      } else {
        alert("Delivery queued!");
      }
    } catch (error) {
      alert(`Failed to queue delivery: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDeliver}
      disabled={loading}
      className="text-color-brand hover:underline font-medium disabled:opacity-50"
    >
      {loading ? "Queuing..." : "Deliver"}
    </button>
  );
}
