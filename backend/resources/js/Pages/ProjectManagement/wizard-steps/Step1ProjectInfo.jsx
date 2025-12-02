import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import { Checkbox } from "@/Components/ui/checkbox";
import { useState, useEffect } from "react";
import AddClient from "../../ClientManagement/add";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/numberFormat";

export default function Step1ProjectInfo({ clients, errors = {} }) {
  const { projectData, updateProjectData } = useProjectWizard();
  const [showAddClient, setShowAddClient] = useState(false);
  const [contractAmountDisplay, setContractAmountDisplay] = useState('');

  // Initialize display value when projectData.contract_amount changes
  useEffect(() => {
    if (projectData.contract_amount) {
      setContractAmountDisplay(formatNumberWithCommas(projectData.contract_amount));
    } else {
      setContractAmountDisplay('');
    }
  }, [projectData.contract_amount]);

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  return (
    <>
      {showAddClient && (
        <AddClient setShowAddModal={setShowAddClient} />
      )}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Name */}
          <div className="md:col-span-2">
            <Label className="text-zinc-800">Project Name <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={projectData.project_name}
              onChange={(e) => updateProjectData({ project_name: e.target.value })}
              placeholder="Enter project name"
              className={inputClass(errors.project_name)}
            />
            <InputError message={errors.project_name} />
          </div>

          {/* Client */}
          <div>
            <Label className="text-zinc-800">Client <span className="text-red-500">*</span></Label>
            <div className="flex gap-2 items-center">
              <Select
                value={projectData.client_id}
                onValueChange={(value) => updateProjectData({ client_id: value })}
              >
                <SelectTrigger className={inputClass(errors.client_id)}>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="whitespace-nowrap"
                onClick={() => setShowAddClient(true)}
              >
                New
              </Button>
            </div>
            <InputError message={errors.client_id} />
          </div>

          {/* Project Type */}
          <div>
            <Label className="text-zinc-800">Project Type <span className="text-red-500">*</span></Label>
            <Select
              value={projectData.project_type}
              onValueChange={(value) => updateProjectData({ project_type: value })}
            >
              <SelectTrigger className={inputClass(errors.project_type)}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="construction">Construction</SelectItem>
                <SelectItem value="consultancy">Consultancy</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="commissioning">Commissioning</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="renovation">Renovation</SelectItem>
                <SelectItem value="site_layout">Site Layout</SelectItem>
                <SelectItem value="relocation">Relocation</SelectItem>
                <SelectItem value="excavation">Excavation</SelectItem>
                <SelectItem value="surveying">Surveying</SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.project_type} />
          </div>

          {/* Status */}
          <div>
            <Label className="text-zinc-800">Status</Label>
            <Select
              value={projectData.status}
              onValueChange={(value) => updateProjectData({ status: value })}
            >
              <SelectTrigger className={inputClass(false)}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <Label className="text-zinc-800">Priority</Label>
            <Select
              value={projectData.priority}
              onValueChange={(value) => updateProjectData({ priority: value })}
            >
              <SelectTrigger className={inputClass(false)}>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contract Amount */}
          <div>
            <Label className="text-zinc-800">Contract Amount <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={contractAmountDisplay}
              onChange={(e) => {
                let inputValue = e.target.value;
                
                // Allow empty string
                if (inputValue === '') {
                  setContractAmountDisplay('');
                  updateProjectData({ contract_amount: '' });
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
                setContractAmountDisplay(formattedValue);
                
                // Store numeric value (without commas)
                const numericValue = parseFormattedNumber(inputValue);
                updateProjectData({ contract_amount: numericValue });
              }}
              placeholder="Enter amount"
              className={inputClass(errors.contract_amount)}
            />
            <InputError message={errors.contract_amount} />
          </div>

          {/* Start Date */}
          <div>
            <Label className="text-zinc-800">Start Date</Label>
            <Input
              type="date"
              value={projectData.start_date}
              onChange={(e) => updateProjectData({ start_date: e.target.value })}
              className={inputClass(false)}
            />
          </div>

          {/* Planned End Date */}
          <div>
            <Label className="text-zinc-800">Planned End Date</Label>
            <Input
              type="date"
              value={projectData.planned_end_date}
              onChange={(e) => updateProjectData({ planned_end_date: e.target.value })}
              className={inputClass(false)}
            />
          </div>

          {/* Actual End Date */}
          {/* <div>
            <Label className="text-zinc-800">Actual End Date</Label>
            <Input
              type="date"
              value={projectData.actual_end_date}
              onChange={(e) => updateProjectData({ actual_end_date: e.target.value })}
              className={inputClass(false)}
            />
          </div> */}

          {/* Billing Type */}
          <div>
            <Label className="text-zinc-800">Billing Type</Label>
            <Select
              value={projectData.billing_type}
              onValueChange={(value) => updateProjectData({ billing_type: value })}
            >
              <SelectTrigger className={inputClass(false)}>
                <SelectValue placeholder="Select billing type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_price">Fixed Price</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="md:col-span-2">
            <Label className="text-zinc-800">Location</Label>
            <Textarea
              value={projectData.location}
              onChange={(e) => updateProjectData({ location: e.target.value })}
              placeholder="Enter project location"
              className={inputClass(false)}
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <Label className="text-zinc-800">Description</Label>
            <Textarea
              value={projectData.description}
              onChange={(e) => updateProjectData({ description: e.target.value })}
              placeholder="Enter project description"
              rows={4}
              className={inputClass(false)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

