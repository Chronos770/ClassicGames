import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  display_name: string;
  avatar_emoji: string;
  role: string;
  created_at: string;
  online_at: string | null;
  email?: string;
}

export interface Announcement {
  id: string;
  admin_id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'update' | 'maintenance';
  active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_response: string | null;
  admin_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string; avatar_emoji: string };
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalGamesPlayed: number;
  openTickets: number;
}

// ── Dashboard ──────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!supabase) return { totalUsers: 0, activeUsers: 0, totalGamesPlayed: 0, openTickets: 0 };

  const [usersRes, activeRes, gamesRes, ticketsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .gte('online_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('game_stats').select('played'),
    supabase.from('support_tickets').select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
  ]);

  const totalGamesPlayed = (gamesRes.data ?? []).reduce((sum, row) => sum + (row.played || 0), 0);

  return {
    totalUsers: usersRes.count ?? 0,
    activeUsers: activeRes.count ?? 0,
    totalGamesPlayed,
    openTickets: ticketsRes.count ?? 0,
  };
}

// ── Users ──────────────────────────────────────────────────────

export async function getUsers(search?: string, limit = 50, offset = 0): Promise<{ users: AdminUser[]; total: number }> {
  if (!supabase) return { users: [], total: 0 };

  let query = supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji, role, created_at, online_at', { count: 'exact' });

  if (search) {
    query = query.ilike('display_name', `%${search}%`);
  }

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { users: (data ?? []) as AdminUser[], total: count ?? 0 };
}

// ── ELO Ratings ────────────────────────────────────────────────

export async function resetEloRatings(gameId: string, adminId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('elo_ratings')
    .update({ rating: 1200, peak_rating: 1200, games_rated: 0 })
    .eq('game_id', gameId);

  if (!error) {
    await logAdminAction(adminId, 'reset_elo', 'elo', gameId, { game_id: gameId });
  }

  return !error;
}

export async function getEloStats(): Promise<{ game_id: string; player_count: number; avg_rating: number }[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('elo_ratings')
    .select('game_id, rating');

  if (!data) return [];

  const byGame: Record<string, { count: number; total: number }> = {};
  for (const row of data) {
    if (!byGame[row.game_id]) byGame[row.game_id] = { count: 0, total: 0 };
    byGame[row.game_id].count++;
    byGame[row.game_id].total += row.rating;
  }

  return Object.entries(byGame).map(([game_id, { count, total }]) => ({
    game_id,
    player_count: count,
    avg_rating: Math.round(total / count),
  }));
}

// ── Announcements ──────────────────────────────────────────────

export async function getAnnouncements(includeInactive = false): Promise<Announcement[]> {
  if (!supabase) return [];

  let query = supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('active', true);
  }

  const { data } = await query;
  return (data ?? []) as Announcement[];
}

export async function createAnnouncement(
  adminId: string,
  title: string,
  content: string,
  type: Announcement['type'] = 'info',
  expiresAt?: string,
): Promise<Announcement | null> {
  if (!supabase) return null;

  const { data } = await supabase
    .from('announcements')
    .insert({
      admin_id: adminId,
      title,
      content,
      type,
      expires_at: expiresAt || null,
    })
    .select()
    .single();

  if (data) {
    await logAdminAction(adminId, 'create_announcement', 'announcement', data.id, { title });
  }

  return data as Announcement | null;
}

export async function updateAnnouncement(id: string, updates: Partial<Announcement>, adminId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id);

  if (!error) {
    await logAdminAction(adminId, 'update_announcement', 'announcement', id, updates);
  }

  return !error;
}

export async function deleteAnnouncement(id: string, adminId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (!error) {
    await logAdminAction(adminId, 'delete_announcement', 'announcement', id);
  }

  return !error;
}

// ── Support Tickets ────────────────────────────────────────────

export async function getTickets(statusFilter?: string): Promise<SupportTicket[]> {
  if (!supabase) return [];

  let query = supabase
    .from('support_tickets')
    .select('*, profiles!support_tickets_user_id_fkey(display_name, avatar_emoji)')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data } = await query;
  return (data ?? []) as SupportTicket[];
}

export async function respondToTicket(
  ticketId: string,
  adminId: string,
  response: string,
  newStatus: SupportTicket['status'] = 'resolved',
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('support_tickets')
    .update({
      admin_response: response,
      admin_id: adminId,
      status: newStatus,
    })
    .eq('id', ticketId);

  if (!error) {
    await logAdminAction(adminId, 'respond_ticket', 'ticket', ticketId, { status: newStatus });
  }

  return !error;
}

export async function createTicket(userId: string, subject: string, message: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('support_tickets')
    .insert({ user_id: userId, subject, message });

  return !error;
}

export async function getUserTickets(userId: string): Promise<SupportTicket[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data ?? []) as SupportTicket[];
}

// ── Active Announcements (for users) ───────────────────────────

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(5);

  return (data ?? []) as Announcement[];
}

// ── Admin Audit Log ────────────────────────────────────────────

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  if (!supabase) return;

  await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    details: details || {},
  });
}

export async function getAdminLogs(limit = 50): Promise<AdminLog[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('admin_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as AdminLog[];
}
