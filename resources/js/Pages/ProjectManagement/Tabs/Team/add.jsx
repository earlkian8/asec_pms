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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { router } from "@inertiajs/react"
import { toast } from "sonner"
import AddUser from "@/Pages/UserManagement/Users/add"

export default function AddProjectTeam({ setShowAddModal, users = [], project }) {
  const [search, setSearch] = useState("")
  const [selectedUsers, setSelectedUsers] = useState([])
  const [formData, setFormData] = useState({})
  const [showNewModal, setShowNewModal] = useState(false)

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.name || ''}`.toLowerCase()
    return (
      fullName.includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
  })

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    } else {
      setSelectedUsers([])
    }
  }

  const toggleUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter((uid) => uid !== id))
    } else {
      setSelectedUsers([...selectedUsers, id])
    }
  }

  const handleChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))
  }

  // Auto-populate role when user is selected
  const handleUserToggle = (userId) => {
    toggleUser(userId);
    const user = users.find(u => u.id === userId);
    if (user && user.role && !formData[userId]?.role) {
      handleChange(userId, 'role', user.role);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user.")
      return
    }

    // Validate required fields
    for (const userId of selectedUsers) {
      if (!formData[userId]?.role) {
        toast.error(`Please enter a role for ${users.find(u => u.id === userId)?.name}`);
        return;
      }
      if (!formData[userId]?.hourly_rate || parseFloat(formData[userId]?.hourly_rate) <= 0) {
        toast.error(`Please enter a valid hourly rate for ${users.find(u => u.id === userId)?.name}`);
        return;
      }
      if (!formData[userId]?.start_date) {
        toast.error(`Please enter a start date for ${users.find(u => u.id === userId)?.name}`);
        return;
      }
    }

    const usersPayload = selectedUsers.map((userId) => ({
      id: userId,
      role: formData[userId]?.role,
      hourly_rate: formData[userId]?.hourly_rate,
      start_date: formData[userId]?.start_date,
      end_date: formData[userId]?.end_date || null,
    }))

    router.post(
      route("project-management.project-teams.store", project.id),
      { users: usersPayload },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success("Team members assigned successfully")
          setShowAddModal(false)
        },
        onError: (errors) => {
          toast.error("Failed to assign some team members.")
        },
      }
    )
  }

  return (
    <Dialog open={true} onOpenChange={() => setShowAddModal(false)}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Add Team Members</DialogTitle>
        </DialogHeader>

        {/* Search + New Button */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Button
            className="bg-zinc-700 hover:bg-zinc-900 text-white"
            onClick={() => setShowNewModal(true)}
          >
            + New
          </Button>
        </div>

        {/* Scrollable Table */}
        <div className="max-h-[400px] overflow-y-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredUsers.length > 0 &&
                      selectedUsers.length === filteredUsers.length
                    }
                    indeterminate={
                      selectedUsers.length > 0 &&
                      selectedUsers.length < filteredUsers.length
                    }
                    onCheckedChange={(checked) => toggleSelectAll(checked)}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role <span class="text-red-500">*</span></TableHead>
                <TableHead>Hourly Rate <span class="text-red-500">*</span></TableHead>
                <TableHead>Start Date <span class="text-red-500">*</span></TableHead>
                <TableHead>End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);

                return (
                  <TableRow
                    key={user.id}
                    onClick={(e) => {
                      if (e.target.closest("input")) return;
                      handleUserToggle(user.id);
                    }}
                    className={`cursor-pointer transition ${
                      isSelected ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUser(user.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Input
                        placeholder={user.role || "Role"}
                        value={formData[user.id]?.role || user.role || ""}
                        onChange={(e) => handleChange(user.id, "role", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData[user.id]?.hourly_rate || ""}
                        onChange={(e) => handleChange(user.id, "hourly_rate", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={formData[user.id]?.start_date || ""}
                        onChange={(e) => handleChange(user.id, "start_date", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        min={project?.start_date || undefined}
                        max={project?.planned_end_date || undefined}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={formData[user.id]?.end_date || ""}
                        onChange={(e) => handleChange(user.id, "end_date", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        min={formData[user.id]?.start_date || project?.start_date || undefined}
                        max={project?.planned_end_date || undefined}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selectedUsers.length === 0}>
            Add Selected
          </Button>
        </DialogFooter>
      </DialogContent>

      {showNewModal && <AddUser setShowAddModal={setShowNewModal} />}
    </Dialog>
  )
}
