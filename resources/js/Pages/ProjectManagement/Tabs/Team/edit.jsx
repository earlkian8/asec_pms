import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { router } from "@inertiajs/react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

export default function EditProjectTeam({ setShowEditModal, projectTeam, project }) {
  const [formData, setFormData] = useState({
    role: projectTeam.role || "",
    hourly_rate: projectTeam.hourly_rate || "",
    start_date: projectTeam.start_date || "",
    end_date: projectTeam.end_date || "",
    is_active: projectTeam.is_active || false,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCheckbox = (checked) => {
    setFormData((prev) => ({
      ...prev,
      is_active: checked,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    router.put(
      route("project-management.project-teams.update", [project.id, projectTeam.id]),
      formData,
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success("Team member updated successfully")
          setShowEditModal(false)
        },
        onError: (errors) => {
          if (errors.role) toast.error(errors.role)
          else toast.error("Failed to update team member. Please try again.")
        },
      }
    )
  }

  return (
    <Dialog open={true} onOpenChange={() => setShowEditModal(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit Team Member – {projectTeam.employee?.first_name}{" "}
            {projectTeam.employee?.last_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Role</Label>
            <Input
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder="e.g. Developer"
            />
          </div>

          <div>
            <Label>Hourly Rate</Label>
            <Input
              name="hourly_rate"
              type="number"
              value={formData.hourly_rate}
              onChange={handleChange}
              placeholder="Enter hourly rate"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                name="start_date"
                value={formData.start_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="flex-1">
              <Label>End Date</Label>
              <Input
                type="date"
                name="end_date"
                value={formData.end_date || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: checked }))
                }
                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
            />
            <Label>Status ({formData.is_active ? "Active" : "Inactive"})</Label>
            </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
