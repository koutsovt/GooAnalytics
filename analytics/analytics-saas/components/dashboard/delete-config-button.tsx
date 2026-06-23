"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteConfigButtonProps {
  id: string;
  businessName: string;
}

export function DeleteConfigButton({ id, businessName }: DeleteConfigButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/configs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Error: ${data.error}`);
        return;
      }

      router.refresh();
    } catch (error) {
      alert(`Failed to delete: ${error}`);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-color-card rounded-lg p-6 max-w-sm border border-color-border">
          <h3 className="text-lg font-semibold text-color-foreground mb-2">Delete Property?</h3>
          <p className="text-color-muted-foreground mb-6">
            Are you sure you want to delete <strong>{businessName}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 rounded-lg border border-color-border text-color-foreground hover:bg-color-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="text-red-600 hover:text-red-700 font-medium text-sm"
    >
      Delete
    </button>
  );
}
