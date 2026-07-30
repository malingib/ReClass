export async function getCommStats(sb: App.Locals['srv'], tenantId: string) {
  const [announcements, templates, sentMessages] = await Promise.all([
    sb.from('comm_announcements').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).then(r => r.count ?? 0),
    sb.from('comm_templates').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).then(r => r.count ?? 0),
    sb.from('notifications').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'sent').then(r => r.count ?? 0),
  ]);
  const published = await sb.from('comm_announcements').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'published').then(r => r.count ?? 0);
  return { announcements, published, templates, sentMessages };
}

export async function getAnnouncements(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb.from('comm_announcements').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  return data ?? [];
}

export async function getTemplates(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb.from('comm_templates').select('*').eq('tenant_id', tenantId).order('name');
  return data ?? [];
}

export async function getNotificationLog(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb.from('notifications').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(100);
  return data ?? [];
}
