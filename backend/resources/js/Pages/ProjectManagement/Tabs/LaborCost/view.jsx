import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Lock, User, Calendar, Clock, CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";

const STANDARD_HOURS = 8;

const STATUS_CONFIG = {
  P:  { label: 'Present',   bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200'  },
  HD: { label: 'Half Day',  bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  A:  { label: 'Absent',    bg: 'bg-red-100',    text: 'text-red-600',    border: 'border-red-200'    },
  NW: { label: 'No Work',   bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200'   },
};

const fmt = (v) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function fmtHours(h) {
  if (!h || h <= 0) return '0h';
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}

const ViewLaborCost = ({ setShowViewModal, project, laborCost }) => {
  const breakdown  = laborCost.payroll_breakdown || {};
  const attendance = laborCost.attendance || {};
  const payType    = laborCost.pay_type || 'hourly';
  const dailyRate  = parseFloat(laborCost.daily_rate) || 0;
  const monthlySalary = parseFloat(laborCost.monthly_salary) || 0;
  const basePay    = parseFloat(laborCost.base_pay) || 0;
  const overpayAmount = parseFloat(laborCost.overpay_amount) || 0;
  const overpayReason = laborCost.overpay_reason || '';
  const doublePayAmount = parseFloat(laborCost.double_pay_amount) || 0;
  const doublePayReason = laborCost.double_pay_reason || '';
  const damagesDeduction = parseFloat(laborCost.damages_deduction) || 0;
  const damagesReason = laborCost.damages_reason || '';
  const otherDeduction = parseFloat(laborCost.other_deduction) || 0;
  const otherDeductionReason = laborCost.other_deduction_reason || '';
  const cashAdvance = parseFloat(laborCost.cash_advance) || 0;
  const cashAdvanceReason = laborCost.cash_advance_reason || '';
  const deductionItems = Array.isArray(laborCost.deduction_items) ? laborCost.deduction_items : [];
  const totalAdditions = overpayAmount + doublePayAmount;
  const totalDeductions = damagesDeduction + otherDeduction + cashAdvance;
  const payrollEvents = Array.isArray(laborCost.payroll_events) ? laborCost.payroll_events : [];
  const isFixed    = payType === 'fixed';
  const isSalary   = payType === 'salary';
  const workflowStatus = laborCost.status || 'submitted';
  const statusLabel = workflowStatus === 'paid'
    ? 'Paid'
    : workflowStatus === 'approved'
      ? 'Approved'
      : 'Submitted';

  // Use breakdown if available (submitted), else compute display from attendance
  const isDateKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);
  const dates = Object.keys(breakdown).length > 0
    ? Object.keys(breakdown).filter(isDateKey).sort()
    : Object.keys(attendance).filter(isDateKey).sort();

  // Aggregate totals from breakdown
  const totals = dates.reduce((acc, date) => {
    const b = breakdown[date];
    if (!b) return acc;
    acc.workedHours     += b.worked_hours     || 0;
    acc.deductionHours  += b.deduction_hours  || 0;
    acc.deductionAmount += b.deduction_amount || 0;
    acc.grossPay        += b.day_pay          || 0;
    if (b.status === 'P' || b.status === 'HD') acc.present++;
    else acc.absent++;
    return acc;
  }, { workedHours: 0, deductionHours: 0, deductionAmount: 0, grossPay: 0, present: 0, absent: 0 });

  const displayGrossPay = isFixed
    ? parseFloat(laborCost.gross_pay) || 0
    : Object.keys(breakdown).length > 0
      ? totals.grossPay
      : parseFloat(laborCost.gross_pay) || 0;

  const PAY_TYPE_LABEL = { hourly: 'Hourly', salary: 'Monthly Salary', fixed: 'Fixed' };
  const PAY_TYPE_COLOR = { hourly: 'bg-blue-100 text-blue-700', salary: 'bg-purple-100 text-purple-700', fixed: 'bg-amber-100 text-amber-700' };

  return (
    <Dialog open onOpenChange={setShowViewModal}>
      <DialogContent className="w-[95vw] max-w-[780px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800 flex items-center gap-2">
            <Lock size={16} className="text-green-600" />
            Payroll Slip — {statusLabel}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            {project?.project_name} · {fmtDate(laborCost.period_start)} – {fmtDate(laborCost.period_end)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Worker + Period header */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Worker</p>
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{laborCost.assignable_name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${laborCost.assignable_type === 'employee' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {laborCost.assignable_type_label}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Pay Period</p>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-gray-900">
                  {fmtDate(laborCost.period_start)} – {fmtDate(laborCost.period_end)}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${PAY_TYPE_COLOR[payType] || PAY_TYPE_COLOR.hourly}`}>
                  {PAY_TYPE_LABEL[payType] || 'Hourly'}
                </span>
                {payType === 'hourly' && dailyRate > 0 && (
                  <span className="text-xs text-gray-500">
                    Daily: <span className="font-semibold text-gray-700">{fmt(dailyRate)}</span>
                    <span className="ml-1 text-gray-400">({fmt(dailyRate / STANDARD_HOURS)}/hr)</span>
                  </span>
                )}
                {payType === 'salary' && monthlySalary > 0 && (
                  <span className="text-xs text-gray-500">
                    Monthly: <span className="font-semibold text-gray-700">{fmt(monthlySalary)}</span>
                    <span className="ml-1 text-gray-400">({fmt(dailyRate)}/day)</span>
                  </span>
                )}
                {payType === 'fixed' && (
                  <span className="text-xs text-gray-500">Flat amount</span>
                )}
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Days Present', value: totals.present,                  color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
              { label: 'Days Absent',  value: totals.absent,                   color: 'text-red-600',   bg: 'bg-red-50 border-red-200'     },
              { label: 'Total Deducted', value: fmtHours(totals.deductionHours), color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
              { label: 'Final Pay',    value: fmt(displayGrossPay),            color: 'text-zinc-900',  bg: 'bg-zinc-50 border-zinc-200'   },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-lg border p-3 ${bg}`}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className={`text-sm font-bold ${color} mt-0.5`}>{value}</p>
              </div>
            ))}
          </div>

          {(basePay > 0 || totalAdditions > 0 || totalDeductions > 0) && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Payroll Adjustments</p>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <p className="text-xs text-indigo-500">Base Pay</p>
                  <p className="font-semibold text-indigo-900">{fmt(basePay)}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600">Additions</p>
                  <p className="font-semibold text-green-700">{fmt(totalAdditions)}</p>
                  <p className="text-xs text-green-600">Overpay {fmt(overpayAmount)} · Double {fmt(doublePayAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-red-600">Deductions</p>
                  <p className="font-semibold text-red-700">{fmt(totalDeductions)}</p>
                  <p className="text-xs text-red-600">Damages {fmt(damagesDeduction)} · Other {fmt(otherDeduction)} · CA {fmt(cashAdvance)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Final Pay</p>
                  <p className="font-bold text-zinc-900">{fmt(displayGrossPay)}</p>
                </div>
              </div>
              {(overpayReason || doublePayReason || damagesReason || otherDeductionReason || cashAdvanceReason) && (
                <div className="mt-3 border-t border-indigo-200 pt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {overpayReason && <p className="text-indigo-700"><span className="font-semibold">Overpay Reason:</span> {overpayReason}</p>}
                  {doublePayReason && <p className="text-indigo-700"><span className="font-semibold">Double Pay Reason:</span> {doublePayReason}</p>}
                  {damagesReason && <p className="text-indigo-700"><span className="font-semibold">Damages Reason:</span> {damagesReason}</p>}
                  {otherDeductionReason && <p className="text-indigo-700"><span className="font-semibold">Other Deduction Reason:</span> {otherDeductionReason}</p>}
                  {cashAdvanceReason && <p className="text-indigo-700"><span className="font-semibold">Cash Advance Reference:</span> {cashAdvanceReason}</p>}
                </div>
              )}
            </div>
          )}

          {deductionItems.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Deduction Lines</p>
              <div className="space-y-1.5">
                {deductionItems.map((item, idx) => (
                  <div key={`${item.type || 'damage'}-${idx}`} className="flex items-center justify-between text-xs">
                    <span className="text-red-700">{item.label || 'Deduction'} ({item.type || 'damage'})</span>
                    <span className="font-semibold text-red-700">-{fmt(parseFloat(item.amount) || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payrollEvents.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-2">Payroll Events</p>
              <div className="space-y-2">
                {payrollEvents.map((event, idx) => (
                  <div key={`${event.type || 'event'}-${idx}`} className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-700">{(event.type || 'event').replace('_', ' ')}</p>
                      <p className="text-xs text-zinc-500">{event.date || '—'}</p>
                    </div>
                    {event.notes && <p className="text-xs text-zinc-600 mt-1">{event.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-day breakdown table — hidden for fixed pay type */}
          {!isFixed && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Daily Breakdown</p>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[90px_70px_90px_90px_60px_70px_70px_80px_80px] bg-gray-50 border-b border-gray-200 px-3 py-2 gap-1">
                {['Date', 'Status', 'Time In', 'Time Out', 'Break', 'Std Hrs', 'Worked', 'Deducted', 'Day Pay'].map(h => (
                  <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>

              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {dates.map(date => {
                  const b = breakdown[date];
                  const raw = attendance[date];

                  // Use breakdown if available, else derive from attendance
                  const status         = b?.status         ?? (typeof raw === 'string' ? raw : raw?.status ?? 'A');
                  const timeIn         = b?.time_in         ?? raw?.time_in  ?? null;
                  const timeOut        = b?.time_out        ?? raw?.time_out ?? null;
                  const breakMins      = b?.break_minutes   ?? raw?.break_minutes ?? 0;
                  const workedHours    = b?.worked_hours    ?? 0;
                  const deductionHours = b?.deduction_hours ?? 0;
                  const deductionAmt   = b?.deduction_amount ?? 0;
                  const dayPay         = b?.day_pay         ?? 0;

                  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.A;
                  const dayObj = new Date(date + 'T00:00:00');
                  const isAbsent = status === 'A' || status === 'NW';
                  const isLate   = !isAbsent && deductionHours > 0.01;

                  return (
                    <div key={date}
                      className={`grid grid-cols-[90px_70px_90px_90px_60px_70px_70px_80px_80px] items-center px-3 py-2 gap-1 text-xs transition-colors ${
                        isAbsent ? 'bg-red-50' : isLate ? 'bg-amber-50' : 'bg-white'
                      }`}>

                      {/* Date */}
                      <div>
                        <p className="font-bold text-gray-700">{dayObj.toLocaleDateString('en-PH', { weekday: 'short' })}</p>
                        <p className="text-gray-500">{dayObj.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
                      </div>

                      {/* Status badge */}
                      <span className={`px-1.5 py-0.5 rounded font-semibold border w-fit ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>

                      {/* Time In */}
                      <span className={isAbsent ? 'text-gray-300' : 'text-gray-700'}>{timeIn || '—'}</span>

                      {/* Time Out */}
                      <span className={isAbsent ? 'text-gray-300' : 'text-gray-700'}>{timeOut || '—'}</span>

                      {/* Break */}
                      <span className={isAbsent ? 'text-gray-300' : 'text-gray-600'}>{isAbsent ? '—' : `${breakMins}m`}</span>

                      {/* Standard hours */}
                      <span className="text-gray-500">{isAbsent ? '—' : `${STANDARD_HOURS}h`}</span>

                      {/* Worked */}
                      <span className={`font-semibold ${isAbsent ? 'text-red-400' : isLate ? 'text-amber-600' : 'text-green-600'}`}>
                        {isAbsent ? '—' : fmtHours(workedHours)}
                      </span>

                      {/* Deducted */}
                      <div>
                        {isAbsent ? (
                          <span className="text-red-400 font-semibold">{fmt(dailyRate)}</span>
                        ) : deductionHours > 0.01 ? (
                          <div>
                            <span className="text-amber-600 font-semibold">{fmtHours(deductionHours)}</span>
                            <p className="text-amber-500">{fmt(deductionAmt)}</p>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>

                      {/* Day Pay */}
                      <span className={`font-bold ${isAbsent ? 'text-red-400' : 'text-gray-900'}`}>
                        {fmt(dayPay)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totals footer */}
              <div className="grid grid-cols-[90px_70px_90px_90px_60px_70px_70px_80px_80px] items-center px-3 py-2 gap-1 bg-zinc-50 border-t-2 border-zinc-200 text-xs font-bold">
                <span className="text-gray-700 col-span-6">Totals</span>
                <span className="text-green-700">{fmtHours(totals.workedHours)}</span>
                <div>
                  <span className="text-amber-600">{fmtHours(totals.deductionHours)}</span>
                  <p className="text-amber-500 font-semibold">{fmt(totals.deductionAmount)}</p>
                </div>
                <span className="text-zinc-900 text-sm">{fmt(displayGrossPay)}</span>
              </div>
            </div>
          </div>
          )}

          {/* Description / Notes */}
          {(laborCost.description || laborCost.notes) && (
            <div className="grid grid-cols-2 gap-3">
              {laborCost.description && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700">{laborCost.description}</p>
                </div>
              )}
              {laborCost.notes && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{laborCost.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Submitted badge */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
              <Lock size={11} /> {statusLabel}
            </span>
            <p className="text-xs text-gray-400">
              {laborCost.created_at && `Created ${fmtDate(laborCost.created_at)}`}
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="button" variant="outline" onClick={() => setShowViewModal(false)}
            className="border-gray-300 hover:bg-gray-50">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewLaborCost;
