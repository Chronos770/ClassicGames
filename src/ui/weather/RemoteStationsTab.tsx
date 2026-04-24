import { useEffect, useState } from 'react';
import {
  addRemoteStation,
  deleteRemoteStation,
  listRemoteStations,
  normalizeEmbedUrl,
  updateRemoteStation,
  type RemoteStation,
} from '../../lib/remoteStationsService';
import RemoteStationCard from './RemoteStationCard';

interface Props {
  tick: number;
}

interface FormState {
  id: string | null;
  name: string;
  embed_url: string;
  latitude: string;
  longitude: string;
  region: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  embed_url: '',
  latitude: '',
  longitude: '',
  region: '',
  notes: '',
};

export default function RemoteStationsTab({ tick }: Props) {
  const [stations, setStations] = useState<RemoteStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listRemoteStations();
      setStations(list);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const startAdd = () => setForm({ ...EMPTY_FORM });
  const startEdit = (s: RemoteStation) =>
    setForm({
      id: s.id,
      name: s.name,
      embed_url: s.embed_url ?? '',
      latitude: String(s.latitude),
      longitude: String(s.longitude),
      region: s.region ?? '',
      notes: s.notes ?? '',
    });

  const cancelForm = () => setForm(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteRemoteStation(id);
      setStations((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const lat = Number(form.latitude);
      const lon = Number(form.longitude);
      if (!form.name.trim()) throw new Error('Name is required');
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('Latitude must be between -90 and 90');
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('Longitude must be between -180 and 180');

      const input = {
        name: form.name,
        embed_url: form.embed_url ? normalizeEmbedUrl(form.embed_url) : null,
        latitude: lat,
        longitude: lon,
        region: form.region,
        notes: form.notes,
      };
      if (form.id) {
        const updated = await updateRemoteStation(form.id, input);
        setStations((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await addRemoteStation(input);
        setStations((prev) => [...prev, created]);
      }
      setForm(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg text-white font-display font-semibold">Watching</h2>
          <p className="text-xs text-white/40">
            Add WeatherLink stations from other accounts (via their public embed URL) and any
            location you want NWS forecast + alerts for. Coordinates drive the forecast.
          </p>
        </div>
        {!form && (
          <button
            onClick={startAdd}
            className="text-sm px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
          >
            + Add station
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200/80 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {form && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
          <div className="text-sm text-white/80 font-semibold">
            {form.id ? 'Edit station' : 'Add station'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Grandma's house"
              required
            />
            <Field
              label="Region (optional)"
              value={form.region}
              onChange={(v) => setForm({ ...form, region: v })}
              placeholder="Springfield, IL"
            />
            <Field
              label="Latitude"
              value={form.latitude}
              onChange={(v) => setForm({ ...form, latitude: v })}
              placeholder="39.7817"
              type="number"
              step="0.0001"
              required
            />
            <Field
              label="Longitude"
              value={form.longitude}
              onChange={(v) => setForm({ ...form, longitude: v })}
              placeholder="-89.6501"
              type="number"
              step="0.0001"
              required
            />
            <div className="sm:col-span-2">
              <Field
                label="WeatherLink embed URL (optional)"
                value={form.embed_url}
                onChange={(v) => setForm({ ...form, embed_url: v })}
                placeholder="https://www.weatherlink.com/embeddablePage/show/..."
                hint="Owner must have enabled the public embed. Pasting just a station ID works too."
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Notes (optional)"
                value={form.notes}
                onChange={(v) => setForm({ ...form, notes: v })}
                placeholder="Why I'm watching this location"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={cancelForm}
              disabled={saving}
              className="text-sm px-3 py-2 text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Add station'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-white/40 text-sm py-12 text-center">Loading watched stations…</div>
      ) : stations.length === 0 && !form ? (
        <div className="bg-white/5 rounded-xl border border-white/10 p-8 text-center">
          <div className="text-white/60 text-base mb-1">No watched stations yet</div>
          <div className="text-xs text-white/40 max-w-md mx-auto">
            Add a station to watch its WeatherLink embed (if public) and pull NWS forecast +
            alerts for that location.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {stations.map((s) => (
            <RemoteStationCard
              key={s.id}
              station={s}
              tick={tick}
              onEdit={() => startEdit(s)}
              onDelete={() => handleDelete(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  type = 'text',
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1 font-semibold">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </div>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none"
      />
      {hint && <div className="text-[10px] text-white/40 mt-1">{hint}</div>}
    </label>
  );
}
