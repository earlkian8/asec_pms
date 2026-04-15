import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import InputError from "@/Components/InputError";
import { Plus, Trash2 } from "lucide-react";

const EVENT_TYPES = [
  { value: "overtime", label: "Overtime" },
  { value: "double_day", label: "Double-Pay Day" },
  { value: "bonus", label: "Performance Bonus" },
  { value: "damage", label: "Damage Incident" },
  { value: "other_deduction", label: "Other Deduction" },
  { value: "cash_advance", label: "Cash Advance Deduction" },
];

const toNum = (v) => parseFloat(v || 0) || 0;
const fmt = (v) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(v || 0);

export function computePayrollEventAmount(event, dailyRate) {
  const hourlyRate = (toNum(dailyRate) || 0) / 8;

  switch (event?.type) {
    case "overtime": {
      const hours = Math.max(0, toNum(event.hours));
      const multiplier = Math.max(1, toNum(event.multiplier) || 1.25);
      return hours * hourlyRate * multiplier;
    }
    case "double_day": {
      const days = Math.max(0, toNum(event.days));
      const multiplier = Math.max(1, toNum(event.multiplier) || 2);
      return days * toNum(dailyRate) * Math.max(0, multiplier - 1);
    }
    case "bonus":
      return Math.max(0, toNum(event.units)) * Math.max(0, toNum(event.unit_value));
    case "damage": {
      const cost = Math.max(0, toNum(event.cost));
      const percent = Math.min(100, Math.max(0, toNum(event.responsibility_percent || 100)));
      return cost * (percent / 100);
    }
    case "other_deduction":
      return Math.max(0, toNum(event.quantity)) * Math.max(0, toNum(event.unit_cost));
    case "cash_advance":
      return Math.max(0, toNum(event.approved_amount));
    default:
      return 0;
  }
}

export function computePayrollEventTotals(events, dailyRate) {
  const list = Array.isArray(events) ? events : [];
  let additions = 0;
  let deductions = 0;

  list.forEach((event) => {
    const amount = computePayrollEventAmount(event, dailyRate);
    if (amount <= 0) return;

    if (["damage", "other_deduction", "cash_advance"].includes(event?.type)) {
      deductions += amount;
    } else {
      additions += amount;
    }
  });

  return {
    additions,
    deductions,
  };
}

function defaultEvent() {
  return {
    type: "overtime",
    date: "",
    notes: "",
    hours: "",
    multiplier: "1.25",
  };
}

function getError(errors, path) {
  return errors?.[path] || null;
}

export default function PayrollEventsEditor({ events, onChange, errors, dailyRate }) {
  const eventList = Array.isArray(events) ? events : [];

  const patchEvent = (idx, patch) => {
    const next = [...eventList];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const addEvent = () => onChange([...(eventList || []), defaultEvent()]);
  const removeEvent = (idx) => onChange(eventList.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 p-3 bg-zinc-50">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-zinc-800 block text-sm">Payroll Events</Label>
          <p className="text-xs text-zinc-500">Record what happened. The system computes payroll adjustments from these events.</p>
        </div>
        <Button type="button" variant="outline" className="flex items-center gap-1" onClick={addEvent}>
          <Plus size={14} /> Add Event
        </Button>
      </div>

      {eventList.length === 0 && (
        <p className="text-xs text-zinc-500 border border-dashed border-zinc-300 rounded-lg p-3 bg-white">
          No events added. Base payroll will use attendance only.
        </p>
      )}

      <div className="space-y-3">
        {eventList.map((event, idx) => {
          const amount = computePayrollEventAmount(event, dailyRate);
          const isDeduction = ["damage", "other_deduction", "cash_advance"].includes(event?.type);

          return (
            <div key={idx} className="rounded-lg border border-zinc-200 bg-white p-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Select value={event.type || "overtime"} onValueChange={(value) => patchEvent(idx, { type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input type="date" value={event.date || ""} onChange={(e) => patchEvent(idx, { date: e.target.value })} />
                </div>

                <Button type="button" variant="outline" size="icon" onClick={() => removeEvent(idx)}>
                  <Trash2 size={14} />
                </Button>
              </div>

              {event.type === "overtime" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="0" step="0.5" value={event.hours || ""} placeholder="Overtime hours"
                    onChange={(e) => patchEvent(idx, { hours: e.target.value })} />
                  <Input type="number" min="1" step="0.01" value={event.multiplier || "1.25"} placeholder="Multiplier"
                    onChange={(e) => patchEvent(idx, { multiplier: e.target.value })} />
                </div>
              )}

              {event.type === "double_day" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="0" step="0.5" value={event.days || ""} placeholder="Double-pay days"
                    onChange={(e) => patchEvent(idx, { days: e.target.value })} />
                  <Input type="number" min="1" step="0.01" value={event.multiplier || "2"} placeholder="Multiplier"
                    onChange={(e) => patchEvent(idx, { multiplier: e.target.value })} />
                </div>
              )}

              {event.type === "bonus" && (
                <div className="grid grid-cols-3 gap-2">
                  <Input value={event.category || ""} placeholder="Bonus category"
                    onChange={(e) => patchEvent(idx, { category: e.target.value })} />
                  <Input type="number" min="0" step="1" value={event.units || ""} placeholder="Units"
                    onChange={(e) => patchEvent(idx, { units: e.target.value })} />
                  <Input type="number" min="0" step="0.01" value={event.unit_value || ""} placeholder="Unit value"
                    onChange={(e) => patchEvent(idx, { unit_value: e.target.value })} />
                </div>
              )}

              {event.type === "damage" && (
                <div className="grid grid-cols-3 gap-2">
                  <Input value={event.category || ""} placeholder="Damage category"
                    onChange={(e) => patchEvent(idx, { category: e.target.value })} />
                  <Input type="number" min="0" step="0.01" value={event.cost || ""} placeholder="Repair cost"
                    onChange={(e) => patchEvent(idx, { cost: e.target.value })} />
                  <Input type="number" min="0" max="100" step="1" value={event.responsibility_percent || "100"} placeholder="Responsibility %"
                    onChange={(e) => patchEvent(idx, { responsibility_percent: e.target.value })} />
                </div>
              )}

              {event.type === "other_deduction" && (
                <div className="grid grid-cols-3 gap-2">
                  <Input value={event.category || ""} placeholder="Deduction category"
                    onChange={(e) => patchEvent(idx, { category: e.target.value })} />
                  <Input type="number" min="0" step="1" value={event.quantity || ""} placeholder="Quantity"
                    onChange={(e) => patchEvent(idx, { quantity: e.target.value })} />
                  <Input type="number" min="0" step="0.01" value={event.unit_cost || ""} placeholder="Unit cost"
                    onChange={(e) => patchEvent(idx, { unit_cost: e.target.value })} />
                </div>
              )}

              {event.type === "cash_advance" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="0" step="0.01" value={event.approved_amount || ""} placeholder="Approved amount"
                    onChange={(e) => patchEvent(idx, { approved_amount: e.target.value })} />
                  <Input value={event.reference_no || ""} placeholder="Reference number"
                    onChange={(e) => patchEvent(idx, { reference_no: e.target.value })} />
                </div>
              )}

              <Textarea value={event.notes || ""} rows={2} placeholder="Event notes"
                onChange={(e) => patchEvent(idx, { notes: e.target.value })} />

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Computed amount</span>
                <span className={`font-semibold ${isDeduction ? "text-red-600" : "text-emerald-700"}`}>
                  {isDeduction ? "-" : "+"}{fmt(amount)}
                </span>
              </div>

              <InputError message={getError(errors, `payroll_events.${idx}.type`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.date`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.hours`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.multiplier`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.days`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.cost`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.responsibility_percent`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.quantity`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.unit_cost`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.approved_amount`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.reference_no`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.units`)} />
              <InputError message={getError(errors, `payroll_events.${idx}.unit_value`)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
