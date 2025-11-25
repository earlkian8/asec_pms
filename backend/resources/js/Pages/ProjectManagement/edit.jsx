import { useForm } from "@inertiajs/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import { Checkbox } from "@/Components/ui/checkbox";
import AddClient from "../ClientManagement/add";

const EditProject = ({ setShowEditModal, clients, project }) => {
  const { data, setData, put, errors, processing } = useForm({
    project_name: project.project_name || "",
    client_id: project.client_id?.toString() || "",
    project_type: project.project_type || "",
    status: project.status || "planning",
    priority: project.priority || "medium",
    contract_amount: project.contract_amount || "",
    start_date: project.start_date || "",
    planned_end_date: project.planned_end_date || "",
    actual_end_date: project.actual_end_date || "",
    location: project.location || "",
    description: project.description || "",
    billing_type: project.billing_type || "fixed_price",
  });

  const [showAddClient, setShowAddClient] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    put(route("project-management.update", project.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowEditModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Project updated successfully!");
        }
      },
      onError: () => {
        toast.error("Please check the form for errors");
      },
    });
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  return (
    <>
      {showAddClient && <AddClient setShowAddModal={setShowAddClient} />}

      <Dialog open onOpenChange={setShowEditModal}>
        <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-800">Edit Project</DialogTitle>
            <DialogDescription className="text-zinc-600">
              Update the project details below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Name */}
            <div className="col-span-2">
              <Label className="text-zinc-800">Project Name</Label>
              <Input
                type="text"
                value={data.project_name}
                onChange={(e) => setData("project_name", e.target.value)}
                placeholder="Enter project name"
                className={inputClass(errors.project_name)}
              />
              <InputError message={errors.project_name} />
            </div>

            {/* Client */}
            <div>
              <Label className="text-zinc-800">Client</Label>
              <div className="flex gap-2 items-center">
                <Select
                  value={data.client_id}
                  onValueChange={(value) => setData("client_id", value)}
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
              <Label className="text-zinc-800">Project Type</Label>
              <Select
                value={data.project_type}
                onValueChange={(value) => setData("project_type", value)}
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
                value={data.status}
                onValueChange={(value) => setData("status", value)}
              >
                <SelectTrigger className={inputClass(errors.status)}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <InputError message={errors.status} />
            </div>

            {/* Priority */}
            <div>
              <Label className="text-zinc-800">Priority</Label>
              <Select
                value={data.priority}
                onValueChange={(value) => setData("priority", value)}
              >
                <SelectTrigger className={inputClass(errors.priority)}>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <InputError message={errors.priority} />
            </div>

            {/* Contract Amount */}
            <div>
              <Label className="text-zinc-800">Contract Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={data.contract_amount}
                onChange={(e) => setData("contract_amount", e.target.value)}
                placeholder="Enter amount"
                className={inputClass(errors.contract_amount)}
              />
              <InputError message={errors.contract_amount} />
            </div>

            {/* Dates */}
            <div>
              <Label className="text-zinc-800">Start Date</Label>
              <Input
                type="date"
                value={data.start_date || ""}
                onChange={(e) => setData("start_date", e.target.value)}
                className={inputClass(errors.start_date)}
              />
              <InputError message={errors.start_date} />
            </div>

            <div>
              <Label className="text-zinc-800">Planned End Date</Label>
              <Input
                type="date"
                value={data.planned_end_date || ""}
                onChange={(e) => setData("planned_end_date", e.target.value)}
                className={inputClass(errors.planned_end_date)}
              />
              <InputError message={errors.planned_end_date} />
            </div>

            <div>
              <Label className="text-zinc-800">Actual End Date</Label>
              <Input
                type="date"
                value={data.actual_end_date || ""}
                onChange={(e) => setData("actual_end_date", e.target.value)}
                className={inputClass(errors.actual_end_date)}
              />
              <InputError message={errors.actual_end_date} />
            </div>

            {/* Billing Type */}
            <div>
              <Label className="text-zinc-800">Billing Type</Label>
              <Select
                value={data.billing_type}
                onValueChange={(value) => setData("billing_type", value)}
              >
                <SelectTrigger className={inputClass(errors.billing_type)}>
                  <SelectValue placeholder="Select billing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_price">Fixed Price</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                </SelectContent>
              </Select>
              <InputError message={errors.billing_type} />
            </div>

            {/* Location */}
            <div className="col-span-2">
              <Label className="text-zinc-800">Location</Label>
              <Textarea
                value={data.location}
                onChange={(e) => setData("location", e.target.value)}
                placeholder="Enter project location"
                className={inputClass(errors.location)}
              />
              <InputError message={errors.location} />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <Label className="text-zinc-800">Description</Label>
              <Textarea
                value={data.description}
                onChange={(e) => setData("description", e.target.value)}
                placeholder="Enter project description"
                className={inputClass(errors.description)}
              />
              <InputError message={errors.description} />
            </div>

            {/* Footer Buttons */}
            <DialogFooter className="col-span-2 flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-zinc-800 text-white hover:bg-zinc-900 transition"
                disabled={processing}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditProject;
