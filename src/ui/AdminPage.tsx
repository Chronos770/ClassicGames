import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import {
  getDashboardStats,
  getUsers,
  getEloStats,
  resetEloRatings,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getTickets,
  respondToTicket,
  getAdminLogs,
  type DashboardStats,
  type AdminUser,
  type Announcement,
  type SupportTicket,
  type AdminLog,
} from '../lib/adminService';

type Tab = 'dashboard' | 'users' | 'elo' | 'announcements' | 'tickets' | 'logs';

export default function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin';

  const [tab, setTab] = useState<Tab>('dashboard');

  // Redirect non-admins
  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  if (!isAdmin) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users' },
    { id: 'elo', label: 'ELO Ratings' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'tickets', label: 'Support' },
    { id: 'logs', label: 'Audit Log' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-lg">
            {'\u2699'}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-white/40">Manage Castle & Cards</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-amber-500/20 text-amber-400 font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'elo' && <EloTab adminId={user!.id} />}
        {tab === 'announcements' && <AnnouncementsTab adminId={user!.id} />}
        {tab === 'tickets' && <TicketsTab adminId={user!.id} />}
        {tab === 'logs' && <LogsTab />}
      </motion.div>
    </div>
  );
}

// ── Dashboard Tab ──────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats);
  }, []);

  if (!stats) return <div className="text-white/40 text-sm">Loading...</div>;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, color: 'text-blue-400' },
    { label: 'Active (7d)', value: stats.activeUsers, color: 'text-green-400' },
    { label: 'Games Played', value: stats.totalGamesPlayed, color: 'text-amber-400' },
    { label: 'Open Tickets', value: stats.openTickets, color: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-xs text-white/40 mb-1">{c.label}</div>
          <div className={`text-2xl font-bold ${c.color}`}>{c.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    const res = await getUsers(search || undefined, pageSize, page * pageSize);
    setUsers(res.users);
    setTotal(res.total);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const isRecent = (dateStr: string | null) => {
    if (!dateStr) return false;
    return Date.now() - new Date(dateStr).getTime() < 5 * 60 * 1000;
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none"
        />
        <span className="text-sm text-white/40 self-center">{total} users</span>
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">User</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{u.avatar_emoji || '\u{1F3AE}'}</span>
                    <span className="text-white/80">{u.display_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/50'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isRecent(u.online_at) ? (
                    <span className="flex items-center gap-1.5 text-green-400 text-xs">
                      <span className="w-2 h-2 rounded-full bg-green-400" /> Online
                    </span>
                  ) : (
                    <span className="text-xs text-white/30">Offline</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-white/40">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-sm text-white/50 hover:text-white disabled:opacity-30 px-3 py-1"
          >
            Prev
          </button>
          <span className="text-xs text-white/40">
            Page {page + 1} of {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * pageSize >= total}
            className="text-sm text-white/50 hover:text-white disabled:opacity-30 px-3 py-1"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ── ELO Tab ────────────────────────────────────────────────────

function EloTab({ adminId }: { adminId: string }) {
  const [eloStats, setEloStats] = useState<{ game_id: string; player_count: number; avg_rating: number }[]>([]);
  const [resetting, setResetting] = useState<string | null>(null);

  useEffect(() => {
    getEloStats().then(setEloStats);
  }, []);

  const handleReset = async (gameId: string) => {
    if (!window.confirm(`Reset ALL ELO ratings for ${gameId}? This cannot be undone.`)) return;
    setResetting(gameId);
    await resetEloRatings(gameId, adminId);
    setResetting(null);
    getEloStats().then(setEloStats);
  };

  const allGames = ['chess', 'checkers', 'hearts', 'battleship', 'solitaire', 'rummy'];

  return (
    <div>
      <h3 className="text-sm text-white/60 mb-4">ELO Ratings by Game</h3>
      <div className="grid gap-3">
        {allGames.map((gameId) => {
          const stat = eloStats.find((s) => s.game_id === gameId);
          return (
            <div key={gameId} className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
              <div>
                <div className="text-white font-medium capitalize">{gameId === 'battleship' ? 'Sea Battle' : gameId}</div>
                <div className="text-xs text-white/40">
                  {stat ? `${stat.player_count} rated players | Avg: ${stat.avg_rating}` : 'No ratings yet'}
                </div>
              </div>
              <button
                onClick={() => handleReset(gameId)}
                disabled={resetting === gameId || !stat}
                className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-30"
              >
                {resetting === gameId ? 'Resetting...' : 'Reset Ratings'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Announcements Tab ──────────────────────────────────────────

function AnnouncementsTab({ adminId }: { adminId: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Announcement['type']>('info');

  const load = useCallback(async () => {
    const data = await getAnnouncements(true);
    setAnnouncements(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    await createAnnouncement(adminId, title.trim(), content.trim(), type);
    setTitle('');
    setContent('');
    setShowForm(false);
    load();
  };

  const handleToggle = async (ann: Announcement) => {
    await updateAnnouncement(ann.id, { active: !ann.active }, adminId);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    await deleteAnnouncement(id, adminId);
    load();
  };

  const typeColors: Record<string, string> = {
    info: 'bg-blue-500/20 text-blue-400',
    warning: 'bg-amber-500/20 text-amber-400',
    update: 'bg-green-500/20 text-green-400',
    maintenance: 'bg-red-500/20 text-red-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-white/60">Announcements</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4 space-y-3">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none"
          />
          <textarea
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none resize-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Type:</span>
            {(['info', 'warning', 'update', 'maintenance'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  type === t ? typeColors[t] : 'bg-white/5 text-white/30 hover:text-white/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || !content.trim()}
            className="btn-primary text-sm py-2 px-4 disabled:opacity-30"
          >
            Publish
          </button>
        </div>
      )}

      <div className="space-y-3">
        {announcements.map((ann) => (
          <div key={ann.id} className={`bg-white/5 rounded-xl p-4 border ${ann.active ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[ann.type]}`}>{ann.type}</span>
                  <h4 className="text-sm font-medium text-white">{ann.title}</h4>
                </div>
                <p className="text-xs text-white/50">{ann.content}</p>
                <p className="text-[10px] text-white/30 mt-1">{new Date(ann.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(ann)}
                  className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg transition-colors"
                >
                  {ann.active ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="text-xs px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="text-sm text-white/30 text-center py-8">No announcements yet</p>
        )}
      </div>
    </div>
  );
}

// ── Tickets Tab ────────────────────────────────────────────────

function TicketsTab({ adminId }: { adminId: string }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filter, setFilter] = useState('all');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  const load = useCallback(async () => {
    const data = await getTickets(filter);
    setTickets(data);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async (ticketId: string, status: SupportTicket['status'] = 'resolved') => {
    if (!response.trim()) return;
    await respondToTicket(ticketId, adminId, response.trim(), status);
    setResponse('');
    setRespondingTo(null);
    load();
  };

  const statusColors: Record<string, string> = {
    open: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-amber-500/20 text-amber-400',
    resolved: 'bg-green-500/20 text-green-400',
    closed: 'bg-white/10 text-white/40',
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              filter === f ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                  <h4 className="text-sm font-medium text-white">{ticket.subject}</h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span>{ticket.profiles?.avatar_emoji} {ticket.profiles?.display_name}</span>
                  <span>{new Date(ticket.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/60 mb-2">{ticket.message}</p>

            {ticket.admin_response && (
              <div className="bg-white/5 rounded-lg p-3 mb-2">
                <p className="text-xs text-amber-400/80 mb-0.5">Admin Response:</p>
                <p className="text-xs text-white/60">{ticket.admin_response}</p>
              </div>
            )}

            {respondingTo === ticket.id ? (
              <div className="space-y-2 mt-3">
                <textarea
                  placeholder="Type your response..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(ticket.id, 'resolved')}
                    disabled={!response.trim()}
                    className="text-xs px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-30"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => handleRespond(ticket.id, 'in_progress')}
                    disabled={!response.trim()}
                    className="text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors disabled:opacity-30"
                  >
                    Reply (In Progress)
                  </button>
                  <button
                    onClick={() => { setRespondingTo(null); setResponse(''); }}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              ticket.status !== 'closed' && (
                <button
                  onClick={() => setRespondingTo(ticket.id)}
                  className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg transition-colors mt-1"
                >
                  Respond
                </button>
              )
            )}
          </div>
        ))}
        {tickets.length === 0 && (
          <p className="text-sm text-white/30 text-center py-8">No tickets found</p>
        )}
      </div>
    </div>
  );
}

// ── Logs Tab ───────────────────────────────────────────────────

function LogsTab() {
  const [logs, setLogs] = useState<AdminLog[]>([]);

  useEffect(() => {
    getAdminLogs(100).then(setLogs);
  }, []);

  return (
    <div>
      <h3 className="text-sm text-white/60 mb-4">Recent Admin Actions</h3>
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Time</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Action</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Target</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-xs text-white/40">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-xs text-white/70">{log.action}</td>
                <td className="px-4 py-2 text-xs text-white/50">{log.target_type} {log.target_id ? `(${log.target_id.slice(0, 8)}...)` : ''}</td>
                <td className="px-4 py-2 text-xs text-white/30 max-w-[200px] truncate">{JSON.stringify(log.details)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-sm text-white/30">No admin actions logged yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
