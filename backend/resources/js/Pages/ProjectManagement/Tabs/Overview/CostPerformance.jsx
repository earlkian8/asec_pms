import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp, Wallet, Activity } from 'lucide-react';

const peso = (n) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(n || 0));

const pct = (n) => (n === null || n === undefined ? '—' : `${Number(n).toFixed(1)}%`);

// Color the variance: positive = under budget (good), negative = over (bad), near-zero = neutral.
const varianceTone = (variance, planned) => {
  if (!planned || planned === 0) return 'text-zinc-500';
  if (variance < 0) return 'text-red-600 font-semibold';
  if (Math.abs(variance) / planned <= 0.05) return 'text-amber-600';
  return 'text-emerald-600 font-semibold';
};

const ACCENT = {
  blue:    { box: 'border-blue-200 bg-blue-50',       icon: 'text-blue-600' },
  amber:   { box: 'border-amber-200 bg-amber-50',     icon: 'text-amber-600' },
  red:     { box: 'border-red-200 bg-red-50',         icon: 'text-red-600' },
  emerald: { box: 'border-emerald-200 bg-emerald-50', icon: 'text-emerald-600' },
  indigo:  { box: 'border-indigo-200 bg-indigo-50',   icon: 'text-indigo-600' },
  zinc:    { box: 'border-zinc-200 bg-zinc-50',       icon: 'text-zinc-600' },
};

const Kpi = ({ label, value, sub, accent = 'zinc', icon: Icon }) => {
  const a = ACCENT[accent] || ACCENT.zinc;
  return (
    <div className={`rounded-lg border ${a.box} p-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
        {Icon ? <Icon size={14} className={a.icon} /> : null}
      </div>
      <div className="mt-1 text-lg font-bold text-zinc-900">{value}</div>
      {sub ? <div className="text-xs text-zinc-500 mt-0.5">{sub}</div> : null}
    </div>
  );
};

export default function CostPerformance({ data }) {
  const [openSections, setOpenSections] = useState({});

  if (!data || !data.totals) return null;
  const { sections = [], totals } = data;

  if (totals.planned_total === 0 && totals.actual_total === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-800 mb-1">Cost Performance</h3>
        <p className="text-sm text-zinc-500">No BOQ data yet. Add BOQ items to see planned vs actual cost.</p>
      </div>
    );
  }

  const toggle = (i) => setOpenSections((p) => ({ ...p, [i]: !p[i] }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">Cost Performance</h3>
          <p className="text-xs text-zinc-500">Planned (scoped) vs actual (logged) per BOQ section.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Kpi label="Planned Total" value={peso(totals.planned_total)} icon={Wallet} accent="blue"
             sub={`Mat ${peso(totals.planned_material)} · Lab ${peso(totals.planned_labor)}`} />
        <Kpi label="Actual to Date" value={peso(totals.actual_total)} icon={Activity} accent="amber"
             sub={`Mat ${peso(totals.actual_material)} · Lab ${peso(totals.actual_labor)}`} />
        <Kpi
          label="Variance"
          value={
            <span className={varianceTone(totals.variance, totals.planned_total)}>
              {peso(totals.variance)} <span className="text-xs">({pct(totals.variance_pct)})</span>
            </span>
          }
          icon={totals.variance >= 0 ? TrendingUp : TrendingDown}
          accent={totals.variance < 0 ? 'red' : 'emerald'}
          sub={totals.variance < 0 ? 'Over scoped budget' : 'Under scoped budget'}
        />
        <Kpi
          label="Projected Margin"
          value={pct(totals.projected_margin)}
          accent="indigo"
          sub={`Contract ${peso(totals.contract_amount)}`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Section / Item</th>
              <th className="px-3 py-2 text-right">Planned Mat</th>
              <th className="px-3 py-2 text-right">Actual Mat</th>
              <th className="px-3 py-2 text-right">Planned Lab</th>
              <th className="px-3 py-2 text-right">Actual Lab</th>
              <th className="px-3 py-2 text-right">Planned Total</th>
              <th className="px-3 py-2 text-right">Actual Total</th>
              <th className="px-3 py-2 text-right">Variance</th>
              <th className="px-3 py-2 text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sections.map((s, i) => {
              const open = !!openSections[i];
              return (
                <Fragment key={`s-${i}`}>
                  <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => toggle(i)}>
                    <td className="px-3 py-2 font-medium text-zinc-800">
                      <span className="inline-flex items-center gap-1">
                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {s.code ? <span className="text-zinc-500 mr-1">{s.code}</span> : null}
                        {s.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{peso(s.planned_material)}</td>
                    <td className="px-3 py-2 text-right">{peso(s.actual_material)}</td>
                    <td className="px-3 py-2 text-right">{peso(s.planned_labor)}</td>
                    <td className="px-3 py-2 text-right">{peso(s.actual_labor)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{peso(s.planned_total)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{peso(s.actual_total)}</td>
                    <td className={`px-3 py-2 text-right ${varianceTone(s.variance, s.planned_total)}`}>{peso(s.variance)}</td>
                    <td className={`px-3 py-2 text-right ${varianceTone(s.variance, s.planned_total)}`}>{pct(s.variance_pct)}</td>
                  </tr>
                  {open && (s.items || []).map((it) => (
                    <tr key={`i-${i}-${it.id}`} className="text-zinc-700">
                      <td className="px-3 py-2 pl-10 text-xs">
                        {it.item_code ? <span className="text-zinc-400 mr-1">{it.item_code}</span> : null}
                        {it.description}
                        <span className="text-zinc-400 ml-2">{Number(it.quantity)} {it.unit}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{peso(it.planned_material)}</td>
                      <td className="px-3 py-2 text-right text-xs">{peso(it.actual_material)}</td>
                      <td className="px-3 py-2 text-right text-xs">{peso(it.planned_labor)}</td>
                      <td className="px-3 py-2 text-right text-xs">{peso(it.actual_labor)}</td>
                      <td className="px-3 py-2 text-right text-xs">{peso(it.planned_total)}</td>
                      <td className="px-3 py-2 text-right text-xs">{peso(it.actual_total)}</td>
                      <td className={`px-3 py-2 text-right text-xs ${varianceTone(it.variance, it.planned_total)}`}>{peso(it.variance)}</td>
                      <td className={`px-3 py-2 text-right text-xs ${varianceTone(it.variance, it.planned_total)}`}>{pct(it.variance_pct)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 text-sm font-semibold text-zinc-900">
              <td className="px-3 py-2">Project Total</td>
              <td className="px-3 py-2 text-right">{peso(totals.planned_material)}</td>
              <td className="px-3 py-2 text-right">{peso(totals.actual_material)}</td>
              <td className="px-3 py-2 text-right">{peso(totals.planned_labor)}</td>
              <td className="px-3 py-2 text-right">{peso(totals.actual_labor)}</td>
              <td className="px-3 py-2 text-right">{peso(totals.planned_total)}</td>
              <td className="px-3 py-2 text-right">{peso(totals.actual_total)}</td>
              <td className={`px-3 py-2 text-right ${varianceTone(totals.variance, totals.planned_total)}`}>{peso(totals.variance)}</td>
              <td className={`px-3 py-2 text-right ${varianceTone(totals.variance, totals.planned_total)}`}>{pct(totals.variance_pct)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
