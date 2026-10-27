'use client';

/**
 * Page-level guard for feature-flagged areas.
 *
 * Wrap a page's default export: when the selected organization lacks
 * `feature`, the page renders an empty state instead of its content. The
 * route stays reachable (deep links, the rail selector) — only the content
 * is withheld. The API enforces the same flag server-side.
 */

import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { ContentCard } from '@/components/layout/content-card';
import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { useOrgFeatures } from '@/hooks/use-user';
import { featureLabel, type OrgFeature } from '@/lib/features';

interface FeatureGateProps {
  feature: OrgFeature;
  /** Heading to keep when the gate closes, so the page still reads as itself. */
  title?: string;
  children: ReactNode;
}

export function FeatureGate({ feature, title, children }: FeatureGateProps) {
  const { hasFeature, organization, isLoading } = useOrgFeatures();

  if (isLoading) return null;
  if (hasFeature(feature)) return <>{children}</>;

  const orgName = organization?.name ?? 'your organization';
  return (
    <div className="min-h-screen">
      {title && <PageHeader title={title} />}
      <div className="px-6 py-6">
        <ContentCard>
          <EmptyState
            icon={Lock}
            title={`This feature is not enabled for ${orgName}.`}
            description={`Contact support to enable ${featureLabel(feature)}.`}
          />
        </ContentCard>
      </div>
    </div>
  );
}
