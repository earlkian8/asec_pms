import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import InputError from "@/Components/InputError";
import { Plus, Trash2 } from "lucide-react";

function itemError(errors, idx, field) {
  return errors?.[`deduction_items.${idx}.${field}`] || null;
}

export default function DeductionItemsEditor({ items, onChange, errors }) {
  const list = Array.isArray(items) ? items : [];

  const addItem = () => {
    onChange([...(list || []), { type: "damage", label: "", amount: "" }]);
  };

  const patchItem = (idx, patch) => {
    const next = [...list];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const removeItem = (idx) => onChange(list.filter((_, i) => i !== idx));

  const total = list.reduce((sum, row) => sum + (parseFloat(row?.amount || 0) || 0), 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-zinc-800 block text-sm">Deduction Items</Label>
          <p className="text-xs text-zinc-500">Add multiple deductions (e.g., multiple damaged equipment records) for one payslip.</p>
        </div>
        <Button type="button" variant="outline" onClick={addItem} className="flex items-center gap-1">
          <Plus size={14} /> Add Deduction
        </Button>
      </div>

      {list.length === 0 && (
        <p className="text-xs text-zinc-500 border border-dashed border-zinc-300 rounded-lg p-3 bg-white">
          No deduction items.
        </p>
      )}

      {list.map((item, idx) => (
        <div key={idx} className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
          <div className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-3">
              <Select value={item.type || "damage"} onValueChange={(v) => patchItem(idx, { type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <InputError message={itemError(errors, idx, "type")} />
            </div>

            <div className="col-span-6">
              <Input value={item.label || ""} placeholder="Reason / item (e.g. Broken grinder wheel)"
                onChange={(e) => patchItem(idx, { label: e.target.value })} />
              <InputError message={itemError(errors, idx, "label")} />
            </div>

            <div className="col-span-2">
              <Input type="number" min="0" step="0.01" value={item.amount || ""} placeholder="Amount"
                onChange={(e) => patchItem(idx, { amount: e.target.value })} />
              <InputError message={itemError(errors, idx, "amount")} />
            </div>

            <div className="col-span-1 flex justify-end">
              <Button type="button" variant="outline" size="icon" onClick={() => removeItem(idx)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      ))}

      <p className="text-xs text-zinc-600">
        Total deduction items: {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(total || 0)}
      </p>
    </div>
  );
}
