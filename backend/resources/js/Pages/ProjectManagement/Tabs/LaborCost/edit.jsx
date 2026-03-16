import { useForm } from "@inertiajs/react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Calendar } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

function getWorkingDates(start, end) {
  if (!start || !end) return [];
  const dates = [];
  const current = new Date(start + 'T00:00:00');
  const last    = new Date(end   + 'T00:00:00');
  while (current <= last) {
    if (current.getDay() !== 0) dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const STATUS_CYCLE = { P: 'A', A: 'HD', HD: 'P' };
const STATUS_STYLE = {
  P:  { label: 'P',  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  full: 'Present'  },
  A:  { label: 'A',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    full: 'Absent'   },
  HD: { label: 'HD', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', full: 'Half Day' },
};

const toDateStr = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

const EditLaborCost = ({ setShowEditModal, project, laborCost, teamMembers }) => {
  const assignableId   = laborCost.user_id || laborCost.employee_id || '';
  const assignableType = laborCost.assignable_type || (laborCost.user_id ? 'user' : 'employee');

  const { data, setData, put, errors, processing } = useForm({
    assignable_id:   assignableId,
    assignable_type: assignableType,
    period_start:    toDateStr(laborCost.period_start),
    period_end:      toDateStr(laborCost.period_end),
    daily_rate:      laborCost.daily_rate || '',
    attendance:      laborCost.attendance || {},
    description:     laborCost.description || '',
    notes:           laborCost.notes || '',
  });

  const workingDates = useMemo(
    () => getWorkingDates(data.period_start, data.period_end),
    [data.period_start, data.period_end]
  );

  const rebuildAttendance = (start, end, existing = {}) => {
    const dates   = getWorkingDates(start, end);
    const rebuilt = {};
    dates.forEach(d => { rebuilt[d] = existing[d] || 'P'; });
    return rebuilt;
  };

  const handlePeriodChange = (field, value) => {
    const newStart = field === 'period_start' ? value : data.period_start;
    const newEnd   = field === 'period_end'   ? value : data.period_end;
    setData(prev => ({
      ...prev,
      [field]:    value,
      attendance: rebuildAttendance(newStart, newEnd, prev.attendance),
    }));
  };

  const toggleDay = (date) => {
    setData('attendance', {
      ...data.attendance,
      [date]: STATUS_CYCLE[data.attendance[date] || 'P'],
    });
  };

  const markAll = (status) => {
    const updated = {};
    workingDates.forEach(d => { updated[d] = status; });
    setData('attendance', updated);
  };

  const handleMemberChange = (compositeValue) => {
    const [type, ...rest] = compositeValue.split('-');
    const id = parseInt(rest.join('-'), 10);
    const member = teamMembers.find(m => m.id === id && (m.type || 'user') === type);
    if (!member) return;
    setData(prev => ({
      ...prev,
      assignable_id:   member.id,
      assignable_type: member.type || 'user',
      daily_rate:      member.daily_rate || prev.daily_rate,
    }));
  };

  const summary = useMemo(() => {
    let P = 0, A = 0, HD = 0;
    Object.values(data.attendance).forEach(s => {
      if (s === 'P') P++;
      else if (s === 'A') A++;
      else if (s === 'HD') HD++;
    });
    const daysPresent = P + HD * 0.5;
    const grossPay    = daysPresent * (parseFloat(data.daily_rate) || 0);
    return { P, A, HD, daysPresent, grossPay };
  }, [data.attendance, data.daily_rate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    put(route('project-management.labor-costs.update', [project.id, laborCost.id]), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowEditModal(false);
        const flash = page.props.flash;
        toast[flash?.error ? 'error' : 'success'](flash?.error || 'Payroll entry updated successfully!');
      },
      onError: () => toast.error('Please check the form for errors.'),
    });
  };

  const inputClass = (err) =>
    'w-full border text-sm rounded-md px-3 py-2 focus:outline-none transition-all ' +
    (err ? 'border-red-500 ring-2 ring-red-400' : 'border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800');

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(v || 0);

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800 flex items-center gap-2">
            <Calendar size={18} className="text-zinc-600" />
            Edit Payroll Entry
          </DialogTitle>
          <DialogDescription className="text-zinc-600">
            Update attendance or rate for this payroll period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Worker + Daily Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-800 mb-1 block">Worker <span className="text-red-500">*</span></Label>
              <Select
                value={data.assignable_id && data.assignable_type ? `${data.assignable_type}-${data.assignable_id}` : ''}
                onValueChange={handleMemberChange}>
                <SelectTrigger className={inputClass(errors.assignable_id)}>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => {
                    const val = `${m.type || 'user'}-${m.id}`;
                    return (
                      <SelectItem key={val} value={val}>
                        <span>{m.name}</span>
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
            <div>
              <Label className="text-zinc-800 mb-1 block">Daily Rate <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0"
                value={data.daily_rate}
                onChange={e => setData('daily_rate', e.target.value)}
                className={inputClass(errors.daily_rate)} />
              <InputError message={errors.daily_rate} />
            </div>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-800 mb-1 block">Period Start <span className="text-red-500">*</span></Label>
              <Input type="date" value={data.period_start}
                onChange={e => handlePeriodChange('period_start', e.target.value)}
                className={inputClass(errors.period_start)} />
              <InputError message={errors.period_start} />
            </div>
            <div>
              <Label className="text-zinc-800 mb-1 block">Period End <span className="text-red-500">*</span></Label>
              <Input type="date" value={data.period_end} min={data.period_start}
                onChange={e => handlePeriodChange('period_end', e.target.value)}
                className={inputClass(errors.period_end)} />
              <InputError message={errors.period_end} />
            </div>
          </div>

          {/* Attendance Sheet */}
          {workingDates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-zinc-800">
                  Attendance <span className="text-zinc-400 font-normal text-xs ml-1">— click to cycle P → A → HD</span>
                </Label>
                <div className="flex gap-1.5">
                  {['P', 'A', 'HD'].map(s => (
                    <button key={s} type="button" onClick={() => markAll(s)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${STATUS_STYLE[s].bg} ${STATUS_STYLE[s].text} ${STATUS_STYLE[s].border} hover:opacity-80`}>
                      All {STATUS_STYLE[s].full}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
                {workingDates.map(date => {
                  const status = data.attendance[date] || 'P';
                  const style  = STATUS_STYLE[status];
                  const d      = new Date(date + 'T00:00:00');
                  return (
                    <button key={date} type="button" onClick={() => toggleDay(date)}
                      className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all hover:scale-105 ${style.bg} ${style.text} ${style.border}`}>
                      <span className="font-bold text-xs opacity-70">{d.toLocaleDateString('en-PH', { weekday: 'short' })}</span>
                      <span className="font-semibold">{d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                      <span className="mt-1 font-bold tracking-wide">{style.label}</span>
                    </button>
                  );
                })}
              </div>
              <InputError message={errors.attendance} />
            </div>
          )}

          {/* Live Summary */}
          {workingDates.length > 0 && data.daily_rate && (
            <div className="grid grid-cols-4 gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              {[
                { label: 'Present',   value: summary.P,                        color: 'text-green-700'  },
                { label: 'Absent',    value: summary.A,                        color: 'text-red-600'    },
                { label: 'Half Days', value: summary.HD,                       color: 'text-yellow-700' },
                { label: 'Gross Pay', value: formatCurrency(summary.grossPay), color: 'text-zinc-900'   },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className={`text-base font-bold ${color} mt-0.5`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Description + Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-800 mb-1 block">Description</Label>
              <Textarea value={data.description} onChange={e => setData('description', e.target.value)}
                placeholder="Work performed this period..." className={inputClass(errors.description)} rows={2} />
              <InputError message={errors.description} />
            </div>
            <div>
              <Label className="text-zinc-800 mb-1 block">Notes</Label>
              <Textarea value={data.notes} onChange={e => setData('notes', e.target.value)}
                placeholder="Additional notes..." className={inputClass(errors.notes)} rows={2} />
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