import { useForm } from "@inertiajs/react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Loader2, Save, Calendar } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

const STANDARD_HOURS = 8;
const DEFAULT_TIME_IN  = '08:00';
const DEFAULT_TIME_OUT = '17:00';
const DEFAULT_BREAK    = 60;

const PRESETS = {
  P:  { label: 'Present',  time_in: DEFAULT_TIME_IN, time_out: DEFAULT_TIME_OUT, break_minutes: DEFAULT_BREAK },
  HD: { label: 'Half Day', time_in: DEFAULT_TIME_IN, time_out: '12:00',          break_minutes: 0             },
  A:  { label: 'Absent',   time_in: '',              time_out: '',               break_minutes: 0             },
  NW: { label: 'No Work',  time_in: '',              time_out: '',               break_minutes: 0             },
};

const PRESET_STYLE = {
  P:  'bg-green-100 text-green-700 border-green-300',
  HD: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  A:  'bg-red-100 text-red-600 border-red-300',
  NW: 'bg-gray-100 text-gray-600 border-gray-300',
};

function getWorkingDates(start, end) {
  if (!start || !end) return [];
  const dates = [];
  const cur  = new Date(start + 'T00:00:00');
  const last = new Date(end   + 'T00:00:00');
  while (cur <= last) {
    if (cur.getDay() !== 0) dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function makeDefaultDay() {
  return { _preset: 'P', time_in: DEFAULT_TIME_IN, time_out: DEFAULT_TIME_OUT, break_minutes: DEFAULT_BREAK };
}

/** Normalise stored entry (old string P/A/HD or new object) to UI format */
function normaliseDay(raw) {
  if (!raw) return makeDefaultDay();
  if (typeof raw === 'string') {
    if (raw === 'A')  return { _preset: 'A',  time_in: '', time_out: '', break_minutes: 0 };
    if (raw === 'HD') return { _preset: 'HD', time_in: DEFAULT_TIME_IN, time_out: '12:00', break_minutes: 0 };
    return { _preset: 'P', ...PRESETS.P };
  }
  // New object format
  const hasTime = !!(raw.time_in);
  const preset  = raw.status === 'A' ? 'A' : (raw._preset || (hasTime ? 'P' : 'A'));
  return {
    _preset:       preset,
    time_in:       raw.time_in       ?? (raw.status === 'A' ? '' : DEFAULT_TIME_IN),
    time_out:      raw.time_out      ?? (raw.status === 'A' ? '' : DEFAULT_TIME_OUT),
    break_minutes: raw.break_minutes ?? (raw.status === 'A' ? 0  : DEFAULT_BREAK),
  };
}

function computeDayHours(day) {
  if (!day?.time_in || !day?.time_out) return 0;
  const [inH,  inM]  = day.time_in.split(':').map(Number);
  const [outH, outM] = day.time_out.split(':').map(Number);
  const worked = (outH * 60 + outM) - (inH * 60 + inM) - (Number(day.break_minutes) || 0);
  return Math.max(0, Math.min(worked / 60, STANDARD_HOURS));
}

function fmtHours(h) {
  if (h <= 0) return '0h';
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}

const fmt = (v) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(v || 0);

const inputCls = (err) =>
  'w-full border text-sm rounded-md px-3 py-2 focus:outline-none transition-all ' +
  (err ? 'border-red-500 ring-2 ring-red-400' : 'border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800');

const toDateStr = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

// ── Attendance Sheet ───────────────────────────────────────────────────────────
function AttendanceSheet({ workingDates, attendance, onChange }) {
  const setField = (date, field, value) => {
    onChange({ ...attendance, [date]: { ...(attendance[date] || makeDefaultDay()), [field]: value, _preset: 'custom' } });
  };

  const applyPreset = (date, presetKey) => {
    const p = PRESETS[presetKey];
    onChange({ ...attendance, [date]: { _preset: presetKey, time_in: p.time_in, time_out: p.time_out, break_minutes: p.break_minutes } });
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-[100px_180px_100px_100px_80px_80px] bg-gray-50 border-b border-gray-200 px-3 py-2 gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preset</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time In</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time Out</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Break</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Worked</span>
      </div>

      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {workingDates.map((date) => {
          const day    = attendance[date] ? normaliseDay(attendance[date]) : makeDefaultDay();
          const hours  = computeDayHours(day);
          const absent = !day.time_in;
          const short  = !absent && (STANDARD_HOURS - hours) > 0.01;
          const dayObj = new Date(date + 'T00:00:00');
          const active = day._preset || 'P';

          return (
            <div key={date}
              className={`grid grid-cols-[100px_180px_100px_100px_80px_80px] items-center px-3 py-2 gap-2 transition-colors ${
                absent ? 'bg-red-50' : short ? 'bg-amber-50' : 'bg-white'
              }`}>

              <div>
                <p className="text-xs font-bold text-gray-700">{dayObj.toLocaleDateString('en-PH', { weekday: 'short' })}</p>
                <p className="text-xs text-gray-500">{dayObj.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
              </div>

              <div className="flex gap-1 flex-wrap">
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button key={key} type="button" onClick={() => applyPreset(date, key)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                      active === key
                        ? `${PRESET_STYLE[key]} ring-1 ring-offset-1 ring-current`
                        : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>

              <Input type="time" value={day.time_in || ''}
                onChange={e => setField(date, 'time_in', e.target.value)}
                disabled={absent}
                className="h-8 text-xs border-gray-300 disabled:opacity-40" />

              <Input type="time" value={day.time_out || ''}
                onChange={e => setField(date, 'time_out', e.target.value)}
                disabled={absent}
                className="h-8 text-xs border-gray-300 disabled:opacity-40" />

              <div className="relative">
                <Input type="number" min="0" max="480"
                  value={absent ? '' : (day.break_minutes ?? DEFAULT_BREAK)}
                  onChange={e => setField(date, 'break_minutes', parseInt(e.target.value) || 0)}
                  disabled={absent}
                  placeholder="min"
                  className="h-8 text-xs border-gray-300 pr-6 disabled:opacity-40" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">m</span>
              </div>

              <div className="text-right">
                {absent ? (
                  <span className="text-xs text-red-400 font-medium">—</span>
                ) : (
                  <>
                    <span className={`text-xs font-bold ${short ? 'text-amber-600' : 'text-green-600'}`}>{fmtHours(hours)}</span>
                    {short && <p className="text-xs text-amber-500">−{fmtHours(STANDARD_HOURS - hours)}</p>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 border-t border-gray-200 px-3 py-1.5">
        <p className="text-xs text-gray-400">
          Pick a preset or customize time in/out · Standard = {STANDARD_HOURS}h · Pay deducted per minute
        </p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
const EditLaborCost = ({ setShowEditModal, project, laborCost, teamMembers }) => {
  const assignableId   = laborCost.user_id || laborCost.employee_id || '';
  const assignableType = laborCost.assignable_type || (laborCost.user_id ? 'user' : 'employee');

  const normalisedAttendance = useMemo(() => {
    const raw = laborCost.attendance || {};
    const out = {};
    Object.entries(raw).forEach(([date, val]) => { out[date] = normaliseDay(val); });
    return out;
  }, [laborCost.attendance]);

  const { data, setData, put, errors, processing, transform } = useForm({
    assignable_id:   assignableId,
    assignable_type: assignableType,
    period_start:    toDateStr(laborCost.period_start),
    period_end:      toDateStr(laborCost.period_end),
    pay_type:        laborCost.pay_type || 'hourly',
    daily_rate:      laborCost.daily_rate || '',
    monthly_salary:  laborCost.monthly_salary || '',
    gross_pay:       laborCost.gross_pay || '',
    attendance:      normalisedAttendance,
    description:     laborCost.description || '',
    notes:           laborCost.notes || '',
  });

  // Strip _preset and inject status before sending
  transform(d => ({
    ...d,
    attendance: Object.fromEntries(
      Object.entries(d.attendance).map(([date, day]) => [
        date,
        {
          status:        day.time_in ? 'P' : 'A',
          time_in:       day.time_in       || null,
          time_out:      day.time_out      || null,
          break_minutes: day.break_minutes ?? 0,
        },
      ])
    ),
  }));

  const workingDates = useMemo(
    () => getWorkingDates(data.period_start, data.period_end),
    [data.period_start, data.period_end]
  );

  const rebuildAttendance = (start, end, existing = {}) => {
    const dates = getWorkingDates(start, end);
    const out = {};
    dates.forEach(d => { out[d] = existing[d] ? normaliseDay(existing[d]) : makeDefaultDay(); });
    return out;
  };

  const handlePeriodChange = (field, value) => {
    const newStart = field === 'period_start' ? value : data.period_start;
    const newEnd   = field === 'period_end'   ? value : data.period_end;
    setData(prev => ({ ...prev, [field]: value, attendance: rebuildAttendance(newStart, newEnd, prev.attendance) }));
  };

  const handleMemberChange = (val) => {
    const [type, ...rest] = val.split('-');
    const id = parseInt(rest.join('-'), 10);
    const member = teamMembers.find(m => m.id === id && (m.type || 'user') === type);
    if (!member) return;
    setData(prev => ({
      ...prev,
      assignable_id:   member.id,
      assignable_type: member.type || 'user',
      pay_type:        member.pay_type || 'hourly',
      daily_rate:      member.pay_type === 'hourly' ? (member.daily_rate || prev.daily_rate) : prev.daily_rate,
      monthly_salary:  member.pay_type === 'salary' ? (member.monthly_salary || prev.monthly_salary) : prev.monthly_salary,
    }));
  };

  const summary = useMemo(() => {
    const payType = data.pay_type || 'hourly';
    let totalHours = 0, present = 0, absent = 0, deducted = 0, grossPay = 0;

    if (payType === 'fixed') {
      present  = workingDates.filter(d => { const day = data.attendance[d] ? normaliseDay(data.attendance[d]) : makeDefaultDay(); return !!day.time_in; }).length;
      absent   = workingDates.length - present;
      grossPay = parseFloat(data.gross_pay) || 0;
    } else if (payType === 'salary') {
      const dailyRate = data.monthly_salary ? (parseFloat(data.monthly_salary) / 26) : 0;
      workingDates.forEach(d => {
        const day = data.attendance[d] ? normaliseDay(data.attendance[d]) : makeDefaultDay();
        if (!day.time_in) { absent++; return; }
        present++;
        grossPay += dailyRate;
      });
    } else {
      const rate = parseFloat(data.daily_rate) || 0;
      const hourlyRate = rate / STANDARD_HOURS;
      workingDates.forEach(d => {
        const day = data.attendance[d] ? normaliseDay(data.attendance[d]) : makeDefaultDay();
        if (!day.time_in) { absent++; return; }
        present++;
        const h = computeDayHours(day);
        totalHours += h;
        const s = STANDARD_HOURS - h;
        if (s > 0.01) deducted += s;
      });
      grossPay = totalHours * hourlyRate;
    }
    return { present, absent, totalHours, deducted, grossPay };
  }, [data.attendance, data.daily_rate, data.monthly_salary, data.gross_pay, data.pay_type, workingDates]);

  const handleSubmit = (e) => {
    e.preventDefault();
    put(route('project-management.labor-costs.update', [project.id, laborCost.id]), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowEditModal(false);
        const flash = page.props.flash;
        toast[flash?.error ? 'error' : 'success'](flash?.error || 'Payroll entry updated successfully!');
      },
      onError: (errs) => {
        console.error('Payroll update errors:', errs);
        toast.error('Please check the form for errors.');
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[780px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800 flex items-center gap-2">
            <Calendar size={18} className="text-zinc-600" /> Edit Payroll Entry
          </DialogTitle>
          <DialogDescription className="text-zinc-600">
            Select a preset per day or customize time in/out. Pay is calculated to the minute.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-800 mb-1 block text-sm">Worker <span className="text-red-500">*</span></Label>
              <Select value={data.assignable_id ? `${data.assignable_type}-${data.assignable_id}` : ''} onValueChange={handleMemberChange}>
                <SelectTrigger className={inputCls(errors.assignable_id)}><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => {
                    const val = `${m.type || 'user'}-${m.id}`;
                    return (
                      <SelectItem key={val} value={val}>
                        {m.name}
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${m.type === 'employee' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {m.type === 'employee' ? 'Employee' : 'User'}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <InputError message={errors.assignable_id} />
            </div>

            {/* Pay Type */}
            <div>
              <Label className="text-zinc-800 mb-1 block text-sm">Pay Type <span className="text-red-500">*</span></Label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs bg-white h-10">
                {[{id:'hourly',label:'Hourly'},{id:'salary',label:'Salary'},{id:'fixed',label:'Fixed'}].map(pt => (
                  <button key={pt.id} type="button" onClick={() => setData('pay_type', pt.id)}
                    className={`flex-1 font-medium transition-all ${
                      data.pay_type === pt.id ? 'bg-zinc-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}>{pt.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Rate field — conditional on pay_type */}
          {data.pay_type === 'fixed' ? (
            <div>
              <Label className="text-zinc-800 mb-1 block text-sm">Gross Pay (Fixed Amount) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" value={data.gross_pay}
                onChange={e => setData('gross_pay', e.target.value)}
                placeholder="e.g. 15000.00" className={inputCls(errors.gross_pay)} />
              <InputError message={errors.gross_pay} />
            </div>
          ) : data.pay_type === 'salary' ? (
            <div>
              <Label className="text-zinc-800 mb-1 block text-sm">Monthly Salary <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" value={data.monthly_salary}
                onChange={e => setData('monthly_salary', e.target.value)}
                placeholder="e.g. 25000.00" className={inputCls(errors.monthly_salary)} />
              <InputError message={errors.monthly_salary} />
              {data.monthly_salary && (
                <p className="text-xs text-gray-400 mt-0.5">
                  = {fmt((parseFloat(data.monthly_salary) || 0) / 26)}/day ÷ 26 working days
                </p>
              )}
            </div>
          ) : (
            <div>
              <Label className="text-zinc-800 mb-1 block text-sm">
                Daily Rate <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1 text-xs">(for {STANDARD_HOURS}h)</span>
              </Label>
              <Input type="number" step="0.01" min="0" value={data.daily_rate}
                onChange={e => setData('daily_rate', e.target.value)} className={inputCls(errors.daily_rate)} />
              <InputError message={errors.daily_rate} />
              {data.daily_rate && <p className="text-xs text-gray-400 mt-0.5">= {fmt((parseFloat(data.daily_rate) || 0) / STANDARD_HOURS)}/hr</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-800 mb-1 block text-sm">Period Start <span className="text-red-500">*</span></Label>
              <Input type="date" value={data.period_start} onChange={e => handlePeriodChange('period_start', e.target.value)} className={inputCls(errors.period_start)} />
              <InputError message={errors.period_start} />
            </div>
            <div>
              <Label className="text-zinc-800 mb-1 block text-sm">Period End <span className="text-red-500">*</span></Label>
              <Input type="date" value={data.period_end} min={data.period_start} onChange={e => handlePeriodChange('period_end', e.target.value)} className={inputCls(errors.period_end)} />
              <InputError message={errors.period_end} />
            </div>
          </div>

          {workingDates.length > 0 && (
            <div>
              <Label className="text-zinc-800 mb-2 block text-sm">Daily Time Record</Label>
              <AttendanceSheet workingDates={workingDates} attendance={data.attendance} onChange={att => setData('attendance', att)} />
              <InputError message={errors.attendance} />
            </div>
          )}

          {workingDates.length > 0 && (data.daily_rate || data.monthly_salary || data.gross_pay) && (
            <div className="grid grid-cols-4 gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              {[
                { label: 'Present',     value: summary.present,              color: 'text-green-700' },
                { label: 'Absent',      value: summary.absent,               color: 'text-red-600'   },
                { label: 'Total Hours', value: data.pay_type === 'fixed' || data.pay_type === 'salary' ? '—' : fmtHours(summary.totalHours),
                  color: summary.deducted > 0 ? 'text-amber-600' : 'text-blue-700',
                  sub: data.pay_type === 'hourly' && summary.deducted > 0 ? `−${fmtHours(summary.deducted)} late` : null },
                { label: 'Gross Pay',   value: fmt(summary.grossPay),        color: 'text-zinc-900'  },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className={`text-sm font-bold ${color} mt-0.5`}>{value}</p>
                  {sub && <p className="text-xs text-amber-500">{sub}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-800 mb-1 block text-sm">Description</Label>
              <Textarea value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Work performed this period..." className={inputCls(errors.description)} rows={2} />
              <InputError message={errors.description} />
            </div>
            <div>
              <Label className="text-zinc-800 mb-1 block text-sm">Notes</Label>
              <Textarea value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Additional notes..." className={inputCls(errors.notes)} rows={2} />
              <InputError message={errors.notes} />
            </div>
          </div>

          <DialogFooter className="border-t pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={processing}>Cancel</Button>
            <Button type="submit" disabled={processing}
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white flex items-center gap-2 disabled:opacity-50">
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" />Updating...</> : <><Save size={15} />Update Entry</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditLaborCost;
