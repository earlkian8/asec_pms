import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog"
import { Input } from "@/Components/ui/input"
import { Button } from "@/Components/ui/button"
import { Label } from "@/Components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table"
import { Checkbox } from "@/Components/ui/checkbox"
import { router } from "@inertiajs/react"
import { toast } from "sonner"
import { Loader2, SquarePen, Search } from "lucide-react"
import AddUser from "@/Pages/UserManagement/Users/add"
import InputError from "@/Components/InputError"

export default function AddProjectTeam({ setShowAddModal, users = [], project }) {
  const [search, setSearch] = useState("")
  const [selectedUsers, setSelectedUsers] = useState([])
  const [formData, setFormData] = useState({})
  const [showNewModal, setShowNewModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState({})

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

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault()
    setProcessing(true)
    setErrors({})

    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user.")
      setProcessing(false)
      return
    }

    // Validate required fields
    const validationErrors = {}
    for (const userId of selectedUsers) {
      if (!formData[userId]?.role) {
        validationErrors[`user_${userId}_role`] = `Please enter a role for ${users.find(u => u.id === userId)?.name}`
      }
      if (!formData[userId]?.hourly_rate || parseFloat(formData[userId]?.hourly_rate) <= 0) {
        validationErrors[`user_${userId}_hourly_rate`] = `Please enter a valid hourly rate for ${users.find(u => u.id === userId)?.name}`
      }
      if (!formData[userId]?.start_date) {
        validationErrors[`user_${userId}_start_date`] = `Please enter a start date for ${users.find(u => u.id === userId)?.name}`
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setProcessing(false)
      toast.error("Please check the form for errors")
      return
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
          setProcessing(false)
          setErrors({})
        },
        onError: (errors) => {
          setProcessing(false)
          setErrors(errors)
          toast.error("Failed to assign some team members.")
        },
      }
    )
  }

  return (
    <>
      {showNewModal && <AddUser setShowAddModal={setShowNewModal} />}

      <Dialog open onOpenChange={setShowAddModal}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-zinc-800">Add Team Members</DialogTitle>
          </DialogHeader>

          {/* Search + New Button */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border-gray-300 rounded-lg"
              />
            </div>

            <Button
              type="button"
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200"
              onClick={() => setShowNewModal(true)}
            >
              <SquarePen className="mr-2 h-4 w-4" />
              New User
            </Button>
          </div>

          {/* Scrollable Table */}
          <div className="max-h-[400px] overflow-y-auto border rounded-xl border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
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
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Email</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">
                    Role <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">
                    Hourly Rate <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">
                    Start Date <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.includes(user.id);
                  const userErrors = {
                    role: errors[`user_${user.id}_role`],
                    hourly_rate: errors[`user_${user.id}_hourly_rate`],
                    start_date: errors[`user_${user.id}_start_date`],
                  }

                  return (
                    <TableRow
                      key={user.id}
                      onClick={(e) => {
                        if (e.target.closest("input")) return;
                        handleUserToggle(user.id);
                      }}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"
                      }`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUser(user.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{user.name}</TableCell>
                      <TableCell className="text-gray-700">{user.email}</TableCell>
                      <TableCell>
                        <Input
                          placeholder={user.role || "Role"}
                          value={formData[user.id]?.role || user.role || ""}
                          onChange={(e) => handleChange(user.id, "role", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={inputClass(userErrors.role)}
                          required
                        />
                        {userErrors.role && (
                          <InputError message={userErrors.role} className="mt-1" />
                        )}
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
                          className={inputClass(userErrors.hourly_rate)}
                          required
                        />
                        {userErrors.hourly_rate && (
                          <InputError message={userErrors.hourly_rate} className="mt-1" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={formData[user.id]?.start_date || ""}
                          onChange={(e) => handleChange(user.id, "start_date", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          min={project?.start_date || undefined}
                          max={project?.planned_end_date || undefined}
                          className={inputClass(userErrors.start_date)}
                          required
                        />
                        {userErrors.start_date && (
                          <InputError message={userErrors.start_date} className="mt-1" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={formData[user.id]?.end_date || ""}
                          onChange={(e) => handleChange(user.id, "end_date", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          min={formData[user.id]?.start_date || project?.start_date || undefined}
                          max={project?.planned_end_date || undefined}
                          className="w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-gray-100 rounded-full p-4 mb-3">
                          <Search className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium text-base">No users found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4 border-t pt-4">
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
              type="button"
              onClick={handleSubmit}
              disabled={processing || selectedUsers.length === 0}
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <SquarePen size={16} />
                  Add Selected ({selectedUsers.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
