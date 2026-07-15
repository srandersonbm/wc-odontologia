import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { PerioSite, PerioSiteKey, PerioTooth } from '../api/types';

const UPPER_ORDER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ORDER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const MOLAR_POSITIONS = new Set([6, 7, 8]);
const isMolar = (fdi: number) => MOLAR_POSITIONS.has(fdi % 10);

function depthColor(depth?: number | null) {
  if (!depth) return 'transparent';
  if (depth <= 3) return 'var(--sage)';
  if (depth <= 5) return 'var(--honey-soft)';
  return 'var(--danger-soft)';
}

export function Periograma({ patientId }: { patientId: number }) {
  const [sites, setSites] = useState<PerioSite[]>([]);
  const [teeth, setTeeth] = useState<PerioTooth[]>([]);

  const load = () => {
    api
      .get<{ sites: PerioSite[]; teeth: PerioTooth[] }>(`/patients/${patientId}/perio`)
      .then((data) => {
        setSites(data.sites);
        setTeeth(data.teeth);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const siteMap = useMemo(() => {
    const m = new Map<string, PerioSite>();
    sites.forEach((s) => m.set(`${s.toothFdi}-${s.site}`, s));
    return m;
  }, [sites]);

  const toothMap = useMemo(() => {
    const m = new Map<number, PerioTooth>();
    teeth.forEach((t) => m.set(t.toothFdi, t));
    return m;
  }, [teeth]);

  const saveSite = async (toothFdi: number, site: PerioSiteKey, patch: Partial<PerioSite>) => {
    const current = siteMap.get(`${toothFdi}-${site}`);
    const next: PerioSite = {
      toothFdi,
      site,
      probingDepth: current?.probingDepth ?? null,
      recession: current?.recession ?? null,
      bleeding: current?.bleeding ?? false,
      suppuration: current?.suppuration ?? false,
      ...patch,
    };
    setSites((prev) => [...prev.filter((s) => !(s.toothFdi === toothFdi && s.site === site)), next]);
    await api.put(`/patients/${patientId}/perio/site`, next);
  };

  const saveTooth = async (toothFdi: number, patch: Partial<PerioTooth>) => {
    const current = toothMap.get(toothFdi);
    const next: PerioTooth = { toothFdi, mobility: current?.mobility ?? 0, furcation: current?.furcation ?? 0, ...patch };
    setTeeth((prev) => [...prev.filter((t) => t.toothFdi !== toothFdi), next]);
    await api.put(`/patients/${patientId}/perio/tooth`, next);
  };

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
        Periograma
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        Profundidade de sondagem (mm) e sangramento em 3 pontos por face, mobilidade e furca por dente.
      </p>

      <div className="flex flex-col gap-6">
        <PerioArch title="Arcada superior" order={UPPER_ORDER} siteMap={siteMap} toothMap={toothMap} onSite={saveSite} onTooth={saveTooth} />
        <PerioArch title="Arcada inferior" order={LOWER_ORDER} siteMap={siteMap} toothMap={toothMap} onSite={saveSite} onTooth={saveTooth} />
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs" style={{ color: 'var(--ink-faint)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded" style={{ width: 12, height: 12, background: 'var(--sage)' }} />
          1–3mm
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded" style={{ width: 12, height: 12, background: 'var(--honey-soft)' }} />
          4–5mm
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded" style={{ width: 12, height: 12, background: 'var(--danger-soft)' }} />
          6mm+
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: 'var(--danger)' }} />
          Sangramento à sondagem
        </span>
      </div>
    </div>
  );
}

function PerioArch({
  title,
  order,
  siteMap,
  toothMap,
  onSite,
  onTooth,
}: {
  title: string;
  order: number[];
  siteMap: Map<string, PerioSite>;
  toothMap: Map<number, PerioTooth>;
  onSite: (fdi: number, site: PerioSiteKey, patch: Partial<PerioSite>) => void;
  onTooth: (fdi: number, patch: Partial<PerioTooth>) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--sage)' }}>
        {title}
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse" style={{ minWidth: 16 * 56 + 100 }}>
          <thead>
            <tr>
              <th className="text-left text-xs pr-2 pb-1" style={{ width: 100 }} />
              {order.map((fdi) => (
                <th key={fdi} className="text-center text-xs pb-1" style={{ color: 'var(--ink)', width: 56 }}>
                  {fdi}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SurfaceRow label="Vestibular" sites={['mv', 'v', 'dv']} order={order} siteMap={siteMap} onSite={onSite} />
            <SurfaceRow label="Palatina/Lingual" sites={['ml', 'l', 'dl']} order={order} siteMap={siteMap} onSite={onSite} />
            <ToothFieldRow label="Mobilidade" order={order} toothMap={toothMap} field="mobility" onTooth={onTooth} />
            <ToothFieldRow label="Furca" order={order} toothMap={toothMap} field="furcation" onTooth={onTooth} onlyMolar />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SurfaceRow({
  label,
  sites,
  order,
  siteMap,
  onSite,
}: {
  label: string;
  sites: PerioSiteKey[];
  order: number[];
  siteMap: Map<string, PerioSite>;
  onSite: (fdi: number, site: PerioSiteKey, patch: Partial<PerioSite>) => void;
}) {
  return (
    <tr>
      <td className="text-xs pr-2 py-1 whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </td>
      {order.map((fdi) => (
        <td key={fdi} className="py-1">
          <div className="flex items-center justify-center gap-0.5">
            {sites.map((site) => (
              <SiteCell key={site} fdi={fdi} site={site} data={siteMap.get(`${fdi}-${site}`)} onSite={onSite} />
            ))}
          </div>
        </td>
      ))}
    </tr>
  );
}

function SiteCell({
  fdi,
  site,
  data,
  onSite,
}: {
  fdi: number;
  site: PerioSiteKey;
  data?: PerioSite;
  onSite: (fdi: number, site: PerioSiteKey, patch: Partial<PerioSite>) => void;
}) {
  const [value, setValue] = useState(data?.probingDepth != null ? String(data.probingDepth) : '');

  useEffect(() => {
    setValue(data?.probingDepth != null ? String(data.probingDepth) : '');
  }, [data?.probingDepth]);

  const commit = () => {
    const n = value === '' ? null : Math.max(0, Math.min(15, Number(value)));
    if (n !== (data?.probingDepth ?? null)) onSite(fdi, site, { probingDepth: n });
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={() => onSite(fdi, site, { bleeding: !data?.bleeding })}
        title="Sangramento à sondagem"
        className="rounded-full"
        style={{ width: 6, height: 6, background: data?.bleeding ? 'var(--danger)' : 'var(--line)', border: 'none', padding: 0 }}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="input"
        style={{ width: 22, height: 22, padding: 0, textAlign: 'center', fontSize: 10, background: depthColor(data?.probingDepth) }}
      />
    </div>
  );
}

function ToothFieldRow({
  label,
  order,
  toothMap,
  field,
  onTooth,
  onlyMolar,
}: {
  label: string;
  order: number[];
  toothMap: Map<number, PerioTooth>;
  field: 'mobility' | 'furcation';
  onTooth: (fdi: number, patch: Partial<PerioTooth>) => void;
  onlyMolar?: boolean;
}) {
  return (
    <tr>
      <td className="text-xs pr-2 py-1 whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </td>
      {order.map((fdi) => {
        const applicable = !onlyMolar || isMolar(fdi);
        const t = toothMap.get(fdi);
        return (
          <td key={fdi} className="py-1 text-center">
            {applicable ? (
              <select
                className="input"
                style={{ width: 40, padding: '2px 4px', fontSize: 11, margin: '0 auto' }}
                value={String(t?.[field] ?? 0)}
                onChange={(e) => onTooth(fdi, { [field]: Number(e.target.value) } as Partial<PerioTooth>)}
              >
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ color: 'var(--ink-faint)' }}>—</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
