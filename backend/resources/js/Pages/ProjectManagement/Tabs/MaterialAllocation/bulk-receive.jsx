import { useState } from "react";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import { Loader2, PackagePlus, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

const BulkReceivingReport = ({ setShowBulkModal, project, allocations, onSuccess }) => {
  const today = new Date().toISOString().split('T')[0];

  // Per-allocation form state: { [allocationId]: { quantity_received, condition, notes } }
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      allocations.map(a => {
        const remaining = (a.quantity_allocated || 0) - (a.quantity_received || 0);
        return [a.id, {
          quantity_received: remaining.toString(),
          condition:         '',
          notes:             '',
          enabled:           true,
        }];
      })
    )
  );

  const [sharedDate, setSharedDate]     = useState(today);
  const [sharedNotes, setSharedNotes]   = useState('');
  const [rowErrors, setRowErrors]       = useState({});
  const [processing, setProcessing]     = useState(false);

  const updateRow = (id, field, value) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    // Clear error on change
    if (rowErrors[`${id}_${field}`]) {
      setRowErrors(prev => { const n = { ...prev }; delete n[`${id}_${field}`]; return n; });
    }
  };

  const toggleRow = (id) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }));
  };

  const validate = () => {
    const errs = {};
    allocations.forEach(a => {
      const row = rows[a.id];
      if (!row.enabled) return;
      const remaining = (a.quantity_allocated || 0) - (a.quantity_received || 0);
      const qty = parseFloat(row.quantity_received);
      if (!row.quantity_received || isNaN(qty) || qty <= 0) {
        errs[`${a.id}_quantity_received`] = 'Required and must be > 0.';
      } else if (qty > remaining) {
        errs[`${a.id}_quantity_received`] = `Max ${remaining} ${(a.inventory_item || a.inventoryItem || {}).unit_of_measure || 'units'}.`;
      }
    });
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setRowErrors(errs);
      toast.error("Please fix the errors before submitting.");
      return;
    }

    const enabledRows = allocations.filter(a => rows[a.id]?.enabled);
    if (enabledRows.length === 0) {
      toast.error("Please enable at least one allocation to receive.");
      return;
    }

    setProcessing(true);

    const payload = {
      received_at: sharedDate,
      items: enabledRows.map(a => ({
        allocation_id:     a.id,
        quantity_received: parseFloat(rows[a.id].quantity_received),
        condition:         rows[a.id].condition || null,
        notes:             rows[a.id].notes || sharedNotes || null,
      })),
    };

    router.post(
      route('project-management.material-allocations.bulk-receiving-report', project.id),
      payload,
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setProcessing(false);
          const flash = page.props.flash;
          if (flash?.error) {
            toast.error(flash.error);
          } else {
            toast.success(`${enabledRows.length} receiving report${enabledRows.length > 1 ? 's' : ''} created successfully!`);
            onSuccess?.();
          }
        },
        onError: (errors) => {
          setProcessing(false);
          toast.error("Some items failed. Please check the form.");
          // Map server errors back to row errors if possible
          const mapped = {};
          Object.entries(errors).forEach(([key, msg]) => {
            // items.0.quantity_received → row id
            const match = key.match(/^items\.(\d+)\.(.+)$/);
            if (match) {
              const idx = parseInt(match[1]);
              const field = match[2];
              const alloc = enabledRows[idx];
              if (alloc) mapped[`${alloc.id}_${field}`] = Array.isArray(msg) ? msg[0] : msg;
            }
          });
          if (Object.keys(mapped).length > 0) setRowErrors(mapped);
        },
      }
    );
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-3 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const enabledCount = allocations.filter(a => rows[a.id]?.enabled).length;

  return (
    <Dialog open onOpenChange={setShowBulkModal}>
      <DialogContent className="w-[95vw] max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800 flex items-center gap-2">
            <PackagePlus size={18} className="text-zinc-600" />
            Bulk Receiving Report
          </DialogTitle>
          <DialogDescription className="text-zinc-600">
            Record material deliveries for {allocations.length} selected allocation{allocations.length > 1 ? 's' : ''}.
            Uncheck any row to skip it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Shared date field */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
            <div>
              <Label className="text-xs font-semibold text-zinc-700 mb-1 block">
                Received Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={sharedDate}
                onChange={e => setSharedDate(e.target.value)}
                className={inputClass(false)}
              />
              <p className="text-xs text-zinc-400 mt-1">Applied to all rows</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-zinc-700 mb-1 block">
                Shared Notes <span className="text-zinc-400 font-normal">(optional)</span>
              </Label>
              <Input
                type="text"
                value={sharedNotes}
                onChange={e => setSharedNotes(e.target.value)}
                placeholder="e.g. Delivered by supplier truck"
                className={inputClass(false)}
              />
              <p className="text-xs text-zinc-400 mt-1">Used if row note is empty</p>
            </div>
          </div>

          {/* Per-allocation rows */}
          <div className="space-y-3">
            {allocations.map((a) => {
              const item      = a.inventory_item || a.inventoryItem || {};
              const remaining = (a.quantity_allocated || 0) - (a.quantity_received || 0);
              const row       = rows[a.id];
              const enabled   = row?.enabled ?? true;

              return (
                <div key={a.id}
                  className={`border rounded-xl p-4 transition-all ${enabled ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50 opacity-60'}`}>

                  {/* Row header */}
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleRow(a.id)}
                      className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-800 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 truncate">{item.item_name || 'Unknown Item'}</p>
                      <p className="text-xs text-zinc-400">
                        Code: {item.item_code || '—'} &nbsp;·&nbsp;
                        Allocated: {a.quantity_allocated} {item.unit_of_measure || 'units'} &nbsp;·&nbsp;
                        Already received: {a.quantity_received || 0} {item.unit_of_measure || 'units'} &nbsp;·&nbsp;
                        <span className="font-medium text-zinc-600">Remaining: {remaining} {item.unit_of_measure || 'units'}</span>
                      </p>
                    </div>
                  </div>

                  {enabled && (
                    <div className="grid grid-cols-3 gap-3 pl-7">
                      {/* Quantity */}
                      <div>
                        <Label className="text-xs text-zinc-600 mb-1 block">
                          Qty to Receive <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={remaining}
                          value={row.quantity_received}
                          onChange={e => updateRow(a.id, 'quantity_received', e.target.value)}
                          className={inputClass(rowErrors[`${a.id}_quantity_received`])}
                        />
                        {rowErrors[`${a.id}_quantity_received`] && (
                          <p className="text-xs text-red-500 mt-1">{rowErrors[`${a.id}_quantity_received`]}</p>
                        )}
                      </div>

                      {/* Condition */}
                      <div>
                        <Label className="text-xs text-zinc-600 mb-1 block">Condition</Label>
                        <Select
                          value={row.condition}
                          onValueChange={v => updateRow(a.id, 'condition', v)}
                        >
                          <SelectTrigger className={inputClass(false)}>
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                            <SelectItem value="incomplete">Incomplete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Notes */}
                      <div>
                        <Label className="text-xs text-zinc-600 mb-1 block">Notes</Label>
                        <Input
                          type="text"
                          value={row.notes}
                          onChange={e => updateRow(a.id, 'notes', e.target.value)}
                          placeholder="Optional note…"
                          className={inputClass(false)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {enabledCount < allocations.length && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <AlertTriangle size={13} />
              {allocations.length - enabledCount} allocation{allocations.length - enabledCount > 1 ? 's' : ''} will be skipped.
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline"
              onClick={() => setShowBulkModal(false)}
              disabled={processing}
              className="border-gray-300 hover:bg-gray-50">
              Cancel
            </Button>
            <Button type="submit"
              disabled={processing || enabledCount === 0}
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
              ) : (
                <><PackagePlus size={15} />Submit {enabledCount} Report{enabledCount > 1 ? 's' : ''}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkReceivingReport;