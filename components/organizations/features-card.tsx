'use client';

/**
 * "Features" card on the organization page: the feature catalogue with an
 * on/off pill per entry. Platform superusers get a switch per row that
 * PATCHes the organization; everyone else reads.
 */

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { useUpdateOrganization } from '@/hooks/use-organization';
import { useCurrentUser } from '@/hooks/use-user';
import { FEATURE_CATALOGUE } from '@/lib/features';

const ON_PILL = 'bg-success-500/10 text-success-700 border-success-500/20';
const OFF_PILL = 'bg-muted text-muted-foreground border-border';

interface FeaturesCardProps {
  organizationId: string;
  features: string[] | undefined;
}

export function FeaturesCard({ organizationId, features }: FeaturesCardProps) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const update = useUpdateOrganization();
  const canEdit = Boolean(user?.is_superuser);
  const enabled = new Set(features ?? []);

  const toggle = (key: string, on: boolean) => {
    const next = FEATURE_CATALOGUE.map((f) => f.key).filter((k) =>
      k === key ? on : enabled.has(k),
    );
    update.mutate(
      { id: organizationId, data: { features: next } },
      {
        onSuccess: () => {
          // The sidebar and page gates read features from /users/me.
          queryClient.invalidateQueries({ queryKey: ['user-profile'] });
          toast.success(on ? 'Feature enabled' : 'Feature disabled');
        },
        onError: (err: unknown) => {
          toast.error('Could not update features', {
            description: err instanceof Error ? err.message : undefined,
          });
        },
      },
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Features</h3>
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? 'Optional product areas enabled for this organization.'
            : 'Optional product areas enabled for this organization. Contact support to change them.'}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {FEATURE_CATALOGUE.map((f) => {
          const on = enabled.has(f.key);
          return (
            <li key={f.key} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`status-pill ${on ? ON_PILL : OFF_PILL}`}>{on ? 'On' : 'Off'}</span>
                {canEdit && (
                  <Switch
                    checked={on}
                    disabled={update.isPending}
                    onCheckedChange={(value) => toggle(f.key, value)}
                    aria-label={`Toggle ${f.label}`}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
