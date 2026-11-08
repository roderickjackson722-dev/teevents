export function clientDemoDashboardLink(event: { tournament_id: string; organization_id: string }) {
  return `/dashboard?admin_org=${encodeURIComponent(event.organization_id)}&tournament_id=${encodeURIComponent(event.tournament_id)}`;
}

export function isProtectedClientDemo(event: { client_sample_id?: string | null; is_converted_from_sample?: boolean | null }) {
  return Boolean(event.client_sample_id && !event.is_converted_from_sample);
}