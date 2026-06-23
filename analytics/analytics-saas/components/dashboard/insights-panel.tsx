"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Loader2, ChevronDown, X } from "lucide-react";

interface InsightsPanelProps {
  metrics: {
    sessions: number;
    sessionsDelta: number;
    impressions: number;
    interactions: number;
    rating: number;
  };
  period: string;
}

interface Insight {
  title: string;
  description: string;
  type: "positive" | "negative" | "neutral";
}

export function InsightsPanel({ metrics, period }: InsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && insights.length === 0 && !isLoading) {
      generateInsights();
    }
  }, [isOpen]);

  const generateInsights = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate client-side insights based on metrics
      const generatedInsights: Insight[] = [];

      // Session insight
      if (metrics.sessionsDelta > 20) {
        generatedInsights.push({
          title: "Strong Session Growth",
          description: `Sessions are up ${metrics.sessionsDelta.toFixed(1)}% compared to the last period. This indicates increased user engagement and traffic.`,
          type: "positive",
        });
      } else if (metrics.sessionsDelta < -10) {
        generatedInsights.push({
          title: "Session Decline",
          description: `Sessions have dropped by ${Math.abs(metrics.sessionsDelta).toFixed(1)}%. Consider reviewing marketing channels and content performance.`,
          type: "negative",
        });
      } else {
        generatedInsights.push({
          title: "Stable Traffic",
          description: `Sessions remain steady with a ${metrics.sessionsDelta > 0 ? "+" : ""}${metrics.sessionsDelta.toFixed(1)}% change. No significant trend detected.`,
          type: "neutral",
        });
      }

      // Impressions insight
      if (metrics.impressions > 5000) {
        generatedInsights.push({
          title: "High Search Visibility",
          description: `${metrics.impressions.toLocaleString()} search impressions indicate strong visibility in search results. Maintain current SEO strategy.`,
          type: "positive",
        });
      }

      // Interactions insight
      if (metrics.interactions > 500) {
        generatedInsights.push({
          title: "Excellent Local Engagement",
          description: `${metrics.interactions.toLocaleString()} local interactions show strong engagement with your business profile. Keep information updated.`,
          type: "positive",
        });
      }

      // Rating insight
      if (metrics.rating >= 4.5) {
        generatedInsights.push({
          title: "Exceptional Rating",
          description: `Your ${metrics.rating.toFixed(1)}-star rating is excellent. Continue delivering quality service to maintain this reputation.`,
          type: "positive",
        });
      } else if (metrics.rating < 4.0) {
        generatedInsights.push({
          title: "Rating Improvement Needed",
          description: `Your ${metrics.rating.toFixed(1)}-star rating could be improved. Review recent feedback and address common concerns.`,
          type: "negative",
        });
      }

      // Overall performance insight
      const avgMetrics = (metrics.sessions + metrics.impressions + metrics.interactions) / 3;
      if (avgMetrics > 2000) {
        generatedInsights.push({
          title: "Strong Overall Performance",
          description: `Your metrics show strong performance across all channels. This is an excellent foundation for growth.`,
          type: "positive",
        });
      }

      setInsights(generatedInsights);
    } catch (err) {
      setError("Failed to generate insights. Please try again.");
      console.error("Error generating insights:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "positive":
        return "bg-color-success/10 border-color-success/30 text-color-success";
      case "negative":
        return "bg-color-danger/10 border-color-danger/30 text-color-danger";
      default:
        return "bg-color-muted/30 border-color-border text-color-foreground";
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "positive":
        return "📈";
      case "negative":
        return "📉";
      default:
        return "💡";
    }
  };

  return (
    <div className="rounded-lg border border-color-border bg-color-card p-4 md:p-6 hover:border-color-brand/30 transition-colors">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left hover:text-color-brand transition-colors"
      >
        <div className="flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-color-brand" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-color-foreground">AI Insights</h3>
          {insights.length > 0 && (
            <span className="text-xs font-bold bg-color-brand text-white px-2 py-1 rounded">
              {insights.length}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="mt-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-4 text-color-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Generating insights...</span>
            </div>
          )}

          {error && (
            <div className="bg-color-danger/10 border border-color-danger/30 text-color-danger p-3 rounded text-sm">
              {error}
            </div>
          )}

          {!isLoading && insights.length > 0 && (
            <div className="space-y-2">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border ${getInsightColor(insight.type)}`}
                >
                  <div className="flex gap-2">
                    <span className="text-lg flex-shrink-0">
                      {getInsightIcon(insight.type)}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{insight.title}</p>
                      <p className="text-xs mt-1 opacity-90">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && insights.length === 0 && !error && (
            <div className="text-center py-4 text-color-muted-foreground text-sm">
              No insights available. Make sure you have data for this period.
            </div>
          )}

          <button
            onClick={generateInsights}
            disabled={isLoading}
            className="w-full mt-3 py-2 text-sm font-medium text-color-brand hover:text-color-brand-dark disabled:opacity-50 transition-colors"
          >
            🔄 Refresh Insights
          </button>
        </div>
      )}
    </div>
  );
}
