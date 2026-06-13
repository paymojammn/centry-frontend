import schema from '@/app/docs/_generated/openapi-checkout.json';

type Param = { name: string; type: string; required: boolean; description: string };
const requestBodies = schema.requestBodies as Record<string, Param[]>;

const methodColor: Record<string, string> = {
  GET: 'text-emerald-600',
  POST: 'text-blue-600',
  PUT: 'text-amber-600',
  PATCH: 'text-purple-600',
  DELETE: 'text-red-600',
};

/**
 * Endpoint reference table rendered from the OpenAPI snapshot in
 * app/docs/_generated/openapi-checkout.json. Regenerate with `npm run sync:docs`
 * so this stays in lockstep with the backend instead of drifting.
 */
export function SchemaEndpointTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border mb-4">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Endpoint</th>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Auth</th>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-xs">
          {schema.endpoints.map((e) => (
            <tr key={`${e.method} ${e.path}`} className="hover:bg-muted/30">
              <td className="px-4 py-2.5 font-mono">
                <span className={`${methodColor[e.method] ?? 'text-foreground'} font-bold`}>{e.method}</span>{' '}
                {e.path.replace('/api/v1', '')}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{e.auth}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{e.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Request-body parameter table for one operation, rendered from the OpenAPI
 * snapshot. Names, types and required flags come from the schema (can't drift);
 * descriptions come from app/docs/checkout/_param-descriptions.json. Pass the
 * operation key, e.g. "POST /api/v1/checkout/sessions/".
 */
export function SchemaParamTable({ opKey }: { opKey: string }) {
  const params = requestBodies[opKey];
  if (!params || params.length === 0) {
    return null;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm table-professional">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Parameter</th>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Type</th>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {params.map((param) => (
            <tr key={param.name} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <code className="text-sm font-mono text-foreground">{param.name}</code>
                {param.required && (
                  <span className="ml-2 text-[10px] text-destructive font-bold uppercase tracking-wider">required</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{param.type}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
