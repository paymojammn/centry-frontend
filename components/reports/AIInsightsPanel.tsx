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
  low: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  high: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
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
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base text-purple-900">AI Insights</CardTitle>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {visibleInsights.length} new
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-purple-600 hover:text-purple-800"
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
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              {insight.priority}
                            </span>
                          ) : null}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {insight.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {insight.description}
                        </p>
                        {insight.metric && (
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Metric: {insight.metric}
                          </div>
                        )}
                        {insight.suggestion && (
                          <div className="text-sm text-purple-700 bg-purple-50 p-2 rounded">
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
                      className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1"
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
