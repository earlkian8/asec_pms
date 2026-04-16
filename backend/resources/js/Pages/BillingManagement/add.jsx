import { useForm } from "@inertiajs/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/numberFormat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Textarea } from "@/Components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select";
import { Loader2, Save, AlertTriangle } from "lucide-react";

const fmt = (n) => parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AddBilling = ({ setShowAddModal, projects = [] }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [billingAmountDisplay, setBillingAmountDisplay] = useState('');

  const { data, setData, post, errors, processing } = useForm({
    project_id: "",
    billing_amount: "",
    billing_date: new Date().toISOString().split('T')[0],
    due_date: "",
    description: "",
  });

  useEffect(() => {
    if (data.project_id) {
      const project = projects.find(p => p.id.toString() === data.project_id.toString());
      if (project) {
        setSelectedProject(project);
        setData(prev => ({ ...prev, billing_amount: '' }));
        setBillingAmountDisplay('');
      }
    } else {
      setSelectedProject(null);
      setData(prev => ({ ...prev, billing_amount: '' }));
      setBillingAmountDisplay('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.project_id]);

  const contractAmount    = selectedProject ? parseFloat(selectedProject.contract_amount || 0) : 0;
  const totalBilled       = selectedProject ? parseFloat(selectedProject.total_billed || 0) : 0;
  const remainingBillable = contractAmount > 0 ? contractAmount - totalBilled : null;
  const enteredAmount     = parseFloat(data.billing_amount) || 0;
  const wouldExceed       = contractAmount > 0 && enteredAmount > 0 && (totalBilled + enteredAmount) > contractAmount;

  const setAmount = (raw) => {
    setBillingAmountDisplay(formatNumberWithCommas(raw));
    setData('billing_amount', parseFormattedNumber(raw));
  };

  const handleAmountChange = (e) => {
    let v = e.target.value;
    if (v === '') { setBillingAmountDisplay(''); setData('billing_amount', ''); return; }
    v = v.replace(/[^\d.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1].length > 2) v = parts[0] + '.' + parts[1].substring(0, 2);
    setAmount(v);
  };

  // Preset helpers
  const presets = [];
  if (selectedProject && contractAmount > 0) {
    if (remainingBillable !== null && remainingBillable > 0) {
      presets.push({ label: 'Remaining', value: remainingBillable.toFixed(2) });
    }
    presets.push({ label: 'Full', value: contractAmount.toFixed(2) });
    [75, 50, 25].forEach(pct => {
      presets.push({ label: `${pct}%`, value: ((contractAmount * pct) / 100).toFixed(2) });
    });
  }

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route("billing-management.store"), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowAddModal(false);
        const flash = page.props.flash;
        if (flash?.error) { toast.error(flash.error); return; }
        if (flash?.warning) toast.warning(flash.warning);
        toast.success("Billing created successfully!");
      },
      onError: () => toast.error("Please check the form for errors"),
    });
  };

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add New Billing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Project <span className="text-red-500">*</span></Label>
            <Select value={data.project_id} onValueChange={(v) => setData("project_id", v)}>
              <SelectTrigger className={inputClass(errors.project_id)}>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.project_code} - {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.project_id} />
          </div>

          {/* Contract amount info bar */}
          {selectedProject && contractAmount > 0 && (
            <div className="col-span-2">
              <Label className="text-zinc-800">Contract Amount</Label>
              <Input
                value={`₱${fmt(contractAmount)}`}
                readOnly
                className="bg-gray-50 border-gray-300 text-gray-600 cursor-not-allowed"
              />
              <div className={`mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs rounded-lg px-3 py-2 border ${
                totalBilled >= contractAmount
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : totalBilled > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}>
                <span>Already billed: <span className="font-semibold">₱{fmt(totalBilled)}</span></span>
                {remainingBillable !== null && (
                  <span>Remaining billable: <span className="font-semibold">₱{fmt(remainingBillable)}</span></span>
                )}
              </div>
            </div>
          )}

          {/* Billing Amount */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Billing Amount <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={billingAmountDisplay}
              onChange={handleAmountChange}
              placeholder="0.00"
              className={inputClass(errors.billing_amount)}
            />
            <InputError message={errors.billing_amount} />

            {/* Presets */}
            {presets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAmount(value)}
                    className="px-2.5 py-1 text-xs rounded-md border border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition-colors font-medium"
                  >
                    {label} {label !== 'Full' && label !== 'Remaining' ? '' : ''} ₱{fmt(value)}
                  </button>
                ))}
              </div>
            )}

            {/* Over-contract warning */}
            {wouldExceed && (
              <div className="mt-2 flex items-start gap-2 text-xs rounded-lg px-3 py-2 border bg-amber-50 border-amber-200 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  This billing will bring total billed to <strong>₱{fmt(totalBilled + enteredAmount)}</strong>, exceeding the contract amount of <strong>₱{fmt(contractAmount)}</strong> by <strong>₱{fmt((totalBilled + enteredAmount) - contractAmount)}</strong>. You can still proceed.
                </span>
              </div>
            )}
          </div>

          {/* Billing Date */}
          <div>
            <Label className="text-zinc-800">Billing Date <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={data.billing_date}
              onChange={(e) => setData("billing_date", e.target.value)}
              className={inputClass(errors.billing_date)}
            />
            <InputError message={errors.billing_date} />
          </div>

          {/* Due Date */}
          <div>
            <Label className="text-zinc-800">Due Date</Label>
            <Input
              type="date"
              value={data.due_date}
              onChange={(e) => setData("due_date", e.target.value)}
              min={data.billing_date}
              className={inputClass(errors.due_date)}
            />
            <InputError message={errors.due_date} />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter billing description"
              rows={3}
              className={inputClass(errors.description)}
            />
            <InputError message={errors.description} />
          </div>

          <DialogFooter className="col-span-2 flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={processing}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={processing}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <><Save size={16} />Create Billing</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBilling;
