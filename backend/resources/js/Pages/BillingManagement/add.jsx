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
import { Loader2, Save } from "lucide-react";

const AddBilling = ({ setShowAddModal, projects = [] }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [billingAmountDisplay, setBillingAmountDisplay] = useState('');

  const { data, setData, post, errors, processing } = useForm({
    project_id: "",
    billing_type: "",
    milestone_id: "",
    billing_amount: "",
    billing_date: new Date().toISOString().split('T')[0],
    due_date: "",
    description: "",
  });

  // Update billing type and milestones when project is selected
  useEffect(() => {
    if (data.project_id) {
      const project = projects.find(p => p.id.toString() === data.project_id.toString());
      if (project) {
        setSelectedProject(project);
        setData('billing_type', project.billing_type);
        setMilestones(project.milestones || []);
        // Clear milestone if project changes
        if (project.billing_type !== 'milestone') {
          setData('milestone_id', '');
          setData('billing_amount', '');
          setBillingAmountDisplay('');
        }
        // For fixed_price billing, auto-fill billing amount with contract amount (fixed)
        if (project.billing_type === 'fixed_price' && project.contract_amount) {
          const amount = parseFloat(project.contract_amount).toFixed(2);
          setData('billing_amount', amount);
          setBillingAmountDisplay(formatNumberWithCommas(amount));
        } else {
          setData('billing_amount', '');
          setBillingAmountDisplay('');
        }
      }
    } else {
      setSelectedProject(null);
      setMilestones([]);
      setData('billing_type', '');
      setData('milestone_id', '');
      setData('billing_amount', '');
      setBillingAmountDisplay('');
    }
  }, [data.project_id]);

  // Sync display value when billing_amount changes (e.g., from milestone calculation)
  useEffect(() => {
    if (data.billing_amount) {
      setBillingAmountDisplay(formatNumberWithCommas(data.billing_amount));
    } else {
      setBillingAmountDisplay('');
    }
  }, [data.billing_amount]);

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
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Billing created successfully!");
        }
      },
      onError: (errors) => {
        if (errors.error) {
          toast.error(errors.error);
        } else {
          toast.error("Please check the form for errors");
        }
      },
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
            <Select
              value={data.project_id}
              onValueChange={(value) => setData("project_id", value)}
            >
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

          {/* Billing Type (auto-filled from project) */}
          {selectedProject && (
            <div className="col-span-2">
              <Label className="text-zinc-800">Billing Type <span className="text-red-500">*</span></Label>
              <Input
                value={data.billing_type === 'fixed_price' ? 'Fixed Price' : data.billing_type === 'milestone' ? 'Milestone' : ''}
                readOnly
                className="bg-gray-50 border-gray-300 text-gray-600 cursor-not-allowed"
              />
              <InputError message={errors.billing_type} />
            </div>
          )}

          {/* Milestone (only for milestone-based billing) */}
          {data.billing_type === 'milestone' && (
            <div className="col-span-2">
              <Label className="text-zinc-800">Milestone <span className="text-red-500">*</span></Label>
              <Select
                value={data.milestone_id}
                onValueChange={(value) => {
                  setData("milestone_id", value);
                  // Calculate billing amount based on milestone percentage
                  const selectedMilestone = milestones.find(m => m.id.toString() === value);
                  if (selectedMilestone && selectedProject && selectedMilestone.billing_percentage) {
                    const calculatedAmount = (parseFloat(selectedProject.contract_amount || 0) * parseFloat(selectedMilestone.billing_percentage)) / 100;
                    setData("billing_amount", calculatedAmount.toFixed(2));
                  }
                }}
              >
                <SelectTrigger className={inputClass(errors.milestone_id)}>
                  <SelectValue placeholder="Select milestone" />
                </SelectTrigger>
                <SelectContent>
                  {milestones.map((milestone) => (
                    <SelectItem key={milestone.id} value={milestone.id.toString()}>
                      {milestone.name} {milestone.billing_percentage ? `(${milestone.billing_percentage}%)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InputError message={errors.milestone_id} />
            </div>
          )}

          {/* Contract Amount Info (read-only) */}
          {selectedProject && selectedProject.contract_amount && (
            <div className="col-span-2">
              <Label className="text-zinc-800">Contract Amount</Label>
              <Input
                value={`₱${parseFloat(selectedProject.contract_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                readOnly
                className="bg-gray-50 border-gray-300 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                {data.billing_type === 'fixed_price' 
                  ? 'Billing amount should not exceed contract amount'
                  : 'For milestone billing, amount is calculated from milestone percentage'}
              </p>
            </div>
          )}

          {/* Billing Amount */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Billing Amount <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={billingAmountDisplay}
              onChange={(e) => {
                // Only allow changes when not read-only
                if (data.billing_type !== 'milestone' && !(data.billing_type === 'fixed_price' && selectedProject)) {
                  let inputValue = e.target.value;
                  
                  // Allow empty string
                  if (inputValue === '') {
                    setBillingAmountDisplay('');
                    setData("billing_amount", '');
                    return;
                  }
                  
                  // Remove all non-numeric characters except decimal point
                  inputValue = inputValue.replace(/[^\d.]/g, '');
                  
                  // Prevent multiple decimal points
                  const parts = inputValue.split('.');
                  if (parts.length > 2) {
                    inputValue = parts[0] + '.' + parts.slice(1).join('');
                  }
                  
                  // Limit decimal places to 2
                  if (parts.length === 2 && parts[1].length > 2) {
                    inputValue = parts[0] + '.' + parts[1].substring(0, 2);
                  }
                  
                  // Format with commas for display
                  const formattedValue = formatNumberWithCommas(inputValue);
                  setBillingAmountDisplay(formattedValue);
                  
                  // Store numeric value (without commas)
                  const numericValue = parseFormattedNumber(inputValue);
                  setData("billing_amount", numericValue);
                }
              }}
              readOnly={data.billing_type === 'milestone' || (data.billing_type === 'fixed_price' && selectedProject)}
              placeholder={selectedProject && data.billing_type === 'fixed_price' 
                ? `Max: ₱${parseFloat(selectedProject.contract_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "0.00"}
              className={data.billing_type === 'fixed_price' || data.billing_type === 'milestone'
                ? "bg-gray-50 border-gray-300 text-gray-600 cursor-not-allowed" 
                : inputClass(errors.billing_amount)}
            />
            {selectedProject && data.billing_type === 'fixed_price' && selectedProject.contract_amount && (
              <p className="text-xs text-gray-500 mt-1">
                Fixed amount: ₱{parseFloat(selectedProject.contract_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
            {data.billing_type === 'milestone' && selectedProject && data.milestone_id && (() => {
              const selectedMilestone = milestones.find(m => m.id.toString() === data.milestone_id.toString());
              if (selectedMilestone && selectedMilestone.billing_percentage && selectedProject.contract_amount) {
                const calculatedAmount = (parseFloat(selectedProject.contract_amount) * parseFloat(selectedMilestone.billing_percentage)) / 100;
                return (
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated from milestone percentage: ₱{parseFloat(selectedProject.contract_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {selectedMilestone.billing_percentage}% = ₱{calculatedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                );
              }
              return null;
            })()}
            <InputError message={errors.billing_amount} />
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

          {/* Footer Buttons */}
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
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Create Billing
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBilling;
