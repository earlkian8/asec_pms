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

  const handleSubmit = (e) => {
    e.preventDefault()

    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user.")
      return
    }

    const usersPayload = selectedUsers.map((userId) => ({
      id: userId,
      role: formData[userId]?.role || "Member",
      hourly_rate: formData[userId]?.hourly_rate || null,
      start_date: formData[userId]?.start_date || null,
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
                <TableHead>Role</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Start Date</TableHead>
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
                      toggleUser(user.id);
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
                        placeholder="Role"
                        value={formData[user.id]?.role || ""}
                        onChange={(e) => handleChange(user.id, "role", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={formData[user.id]?.hourly_rate || ""}
                        onChange={(e) => handleChange(user.id, "hourly_rate", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={formData[user.id]?.start_date || ""}
                        onChange={(e) => handleChange(user.id, "start_date", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={formData[user.id]?.end_date || ""}
                        onChange={(e) => handleChange(user.id, "end_date", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
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
