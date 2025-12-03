import { useState } from "react"
import { useForm } from "@inertiajs/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/Components/ui/dialog"
import { Input } from "@/Components/ui/input"
import { Button } from "@/Components/ui/button"
import { Label } from "@/Components/ui/label"
import { router } from "@inertiajs/react"
import { toast } from "sonner"
import { Switch } from "@/Components/ui/switch"
import { Loader2, Save } from "lucide-react"
import InputError from "@/Components/InputError"

export default function EditProjectTeam({ setShowEditModal, projectTeam, project }) {
  // Format dates for input fields (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split('T')[0];
  };

  // Get role from user/employee profile (not from projectTeam.role which might be outdated)
  const getRoleFromProfile = () => {
    if (projectTeam?.assignable_type === 'employee' && projectTeam?.employee?.position) {
      return projectTeam.employee.position;
    }
    if (projectTeam?.assignable_type === 'user' && projectTeam?.user?.roles?.[0]?.name) {
      return projectTeam.user.roles[0].name;
    }
    // Fallback to stored role if profile role is not available
    return projectTeam?.role || "";
  };

  const roleFromProfile = getRoleFromProfile();

  const { data, setData, put, errors, processing, transform } = useForm({
    role: roleFromProfile,
    hourly_rate: projectTeam?.hourly_rate ? parseFloat(projectTeam.hourly_rate) : 0,
    start_date: formatDateForInput(projectTeam?.start_date),
    end_date: formatDateForInput(projectTeam?.end_date),
    is_active: projectTeam?.is_active ?? false,
  })

  // Transform data before submission
  transform((data) => ({
    role: data.role.trim(),
    hourly_rate: parseFloat(data.hourly_rate) || 0,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    is_active: Boolean(data.is_active),
  }))

  const [validationErrors, setValidationErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationErrors({})

    // Client-side validation
    const errors = {};
    if (!data.hourly_rate || parseFloat(data.hourly_rate) <= 0) {
      errors.hourly_rate = "Please enter a valid hourly rate";
    }
    if (!data.start_date) {
      errors.start_date = "Please enter a start date";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please check the form for errors");
      return;
    }

    put(
      route("project-management.project-teams.update", [project.id, projectTeam.id]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowEditModal(false)
          setValidationErrors({})
          const flash = page.props.flash
          if (flash && flash.error) {
            toast.error(flash.error)
          } else {
            toast.success("Team member updated successfully")
          }
        },
        onError: (errors) => {
          console.error('Update errors:', errors)
          setValidationErrors(errors)
          if (errors && Object.keys(errors).length > 0) {
            const firstError = Object.values(errors)[0]
            toast.error(Array.isArray(firstError) ? firstError[0] : firstError)
          } else {
            toast.error("Please check the form for errors")
          }
        },
      }
    )
  }

  const getFieldError = (field) => {
    return validationErrors[field] || errors[field];
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800")

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit Team Member</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Update team member details for {projectTeam?.user?.name || 'this member'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Role */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Role</Label>
            <Input
              type="text"
              value={data.role}
              readOnly
              placeholder="Role from user/employee profile"
              className="bg-gray-50 border-gray-300 text-gray-700 cursor-not-allowed"
              title="Role is automatically set from user/employee profile and cannot be modified"
            />
            <p className="text-xs text-gray-500 mt-1">Role is automatically set from user/employee profile</p>
          </div>

          {/* Hourly Rate */}
          <div>
            <Label className="text-zinc-800">Hourly Rate <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={data.hourly_rate}
              onChange={(e) => {
                setData("hourly_rate", parseFloat(e.target.value) || 0);
                if (validationErrors.hourly_rate) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.hourly_rate;
                    return newErrors;
                  });
                }
              }}
              placeholder="Enter hourly rate"
              className={inputClass(getFieldError("hourly_rate"))}
              required
            />
            <InputError message={getFieldError("hourly_rate")} />
          </div>

          {/* Status */}
          <div>
            <Label className="text-zinc-800">Status</Label>
            <div className="flex items-center gap-3 mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <Switch
                checked={data.is_active}
                onCheckedChange={(checked) => setData("is_active", checked)}
                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
              />
              <span className={`text-sm font-medium ${
                data.is_active ? 'text-green-700' : 'text-red-700'
              }`}>
                {data.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <InputError message={errors.is_active} />
          </div>

          {/* Start Date */}
          <div>
            <Label className="text-zinc-800">Start Date <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={data.start_date || ""}
              onChange={(e) => {
                setData("start_date", e.target.value);
                if (validationErrors.start_date) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.start_date;
                    return newErrors;
                  });
                }
              }}
              min={project?.start_date || undefined}
              max={project?.planned_end_date || undefined}
              className={inputClass(getFieldError("start_date"))}
              required
            />
            <InputError message={getFieldError("start_date")} />
          </div>

          {/* End Date */}
          <div>
            <Label className="text-zinc-800">End Date</Label>
            <Input
              type="date"
              value={data.end_date || ""}
              onChange={(e) => setData("end_date", e.target.value)}
              min={data.start_date || project?.start_date || undefined}
              max={project?.planned_end_date || undefined}
              className={inputClass(errors.end_date)}
            />
            <InputError message={errors.end_date} />
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="col-span-2 flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
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
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
