/**
 * AI Insights Panel Component
 * Displays AI-generated insights with ability to dismiss
 */

'use client';

import { useState } from 'react';
import { useDismissInsight } from '@/hooks/use-reports';
import type { AIInsight } from '@/types/reports';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  LineChart,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AIInsightsPanelProps {
  insights: AIInsight[];
  organizationId: string;
}

const INSIGHT_ICONS = {
  anomaly: AlertTriangle,
  trend: TrendingUp,
  recommendation: Lightbulb,
  prediction: LineChart,
  summary: FileText,
};

const PRIORITY_COLORS = {
  low: { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' },
  medium: { bg: 'bg-info-500/10', text: 'text-info-700', border: 'border-info/20' },
  high: { bg: 'bg-warning-400/10', text: 'text-warning-400', border: 'border-warning-400/20' },
  critical: { bg: 'bg-destructive/5', text: 'text-destructive', border: 'border-destructive/20' },
};

const INSIGHT_TYPE_LABELS = {
  anomaly: 'Anomaly Detected',
  trend: 'Trend Analysis',
  recommendation: 'Recommendation',
  prediction: 'Prediction',
  summary: 'Summary',
};

export default function AIInsightsPanel({
  insights,
  organizationId,
}: AIInsightsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dismissMutation = useDismissInsight();

  const visibleInsights = insights.filter(
    (insight) => !insight.is_dismissed && !dismissedIds.has(insight.id)
  );

  const handleDismiss = (insightId: string) => {
    // Optimistically remove from UI
    setDismissedIds((prev) => new Set([...prev, insightId]));

    // Call API
    dismissMutation.mutate(
      { organizationId, insightId },
      {
        onError: () => {
          // Revert on error
          setDismissedIds((prev) => {
            const next = new Set(prev);
            next.delete(insightId);
            return next;
          });
        },
      }
    );
  };

  if (visibleInsights.length === 0) {
    return null;
  }

  return (
    <Card className="border-heather/20 bg-gradient-to-r from-heather/10 to-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-heather" />
            <CardTitle className="text-base text-heather">AI Insights</CardTitle>
            <span className="text-xs bg-heather/10 text-heather px-2 py-0.5 rounded-full">
              {visibleInsights.length} new
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-heather hover:text-heather"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-2">
          <div className="space-y-3">
            {visibleInsights.map((insight) => {
              const Icon = INSIGHT_ICONS[insight.type] || FileText;
              const colors = PRIORITY_COLORS[insight.priority];
              const typeLabel = INSIGHT_TYPE_LABELS[insight.type];

              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${colors.bg}`}>
                        <Icon className={`h-4 w-4 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${colors.text}`}>
                            {typeLabel}
                          </span>
                          {insight.priority === 'high' || insight.priority === 'critical' ? (
                            <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                              {insight.priority}
                            </span>
                          ) : null}
                        </div>
                        <h4 className="font-medium text-foreground mb-1">
                          {insight.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>
                        {insight.metric && (
                          <div className="text-sm font-medium text-foreground mb-2">
                            Metric: {insight.metric}
                          </div>
                        )}
                        {insight.suggestion && (
                          <div className="text-sm text-heather bg-heather/10 p-2 rounded">
                            <Lightbulb className="h-3 w-3 inline mr-1" />
                            {insight.suggestion}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(insight.id)}
                      className="text-muted-foreground/60 hover:text-muted-foreground -mt-1 -mr-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
