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
import { Loader2, SquarePen, Search, UserCheck, Users } from "lucide-react"
import AddUser from "@/Pages/UserManagement/Users/add"
import AddEmployee from "@/Pages/EmployeeManagement/add"
import InputError from "@/Components/InputError"

export default function AddProjectTeam({ setShowAddModal, assignables = [], project }) {
  const [search, setSearch] = useState("")
  const [selectedAssignables, setSelectedAssignables] = useState([])
  const [formData, setFormData] = useState({})
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState({})

  // Ensure assignables is always an array
  const safeAssignables = Array.isArray(assignables) ? assignables : []

  const filteredAssignables = safeAssignables.filter((a) => {
    if (!a) return false
    const fullName = `${a.name || ''}`.toLowerCase()
    const email = a.email ? a.email.toLowerCase() : ''
    const position = a.position ? a.position.toLowerCase() : ''
    return (
      fullName.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase()) ||
      position.includes(search.toLowerCase())
    )
  })

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedAssignables(filteredAssignables.map((a) => a.id))
    } else {
      setSelectedAssignables([])
    }
  }

  const toggleAssignable = (id) => {
    if (selectedAssignables.includes(id)) {
      setSelectedAssignables(selectedAssignables.filter((aid) => aid !== id))
    } else {
      setSelectedAssignables([...selectedAssignables, id])
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

  // Auto-populate role when assignable is selected
  const handleAssignableToggle = (assignableId) => {
    toggleAssignable(assignableId);
    const assignable = safeAssignables.find(a => a && a.id === assignableId);
    if (assignable) {
      if (assignable.type === 'user' && assignable.role && !formData[assignableId]?.role) {
        handleChange(assignableId, 'role', assignable.role);
      } else if (assignable.type === 'employee' && assignable.position && !formData[assignableId]?.role) {
        handleChange(assignableId, 'role', assignable.position);
      }
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

    if (selectedAssignables.length === 0) {
      toast.error("Please select at least one team member.")
      setProcessing(false)
      return
    }
    
    // Validate that all selected assignables exist
    const missingAssignables = selectedAssignables.filter(id => 
      !safeAssignables.find(a => a && a.id === id)
    )
    if (missingAssignables.length > 0) {
      toast.error("Some selected team members are no longer available. Please refresh and try again.")
      setProcessing(false)
      return
    }

    // Validate required fields
    const validationErrors = {}
    for (const assignableId of selectedAssignables) {
      const assignable = safeAssignables.find(a => a && a.id === assignableId)
      const assignableName = assignable?.name || 'Team Member'
      if (!formData[assignableId]?.role) {
        validationErrors[`assignable_${assignableId}_role`] = `Please enter a role for ${assignableName}`
      }
      if (!formData[assignableId]?.hourly_rate || parseFloat(formData[assignableId]?.hourly_rate) <= 0) {
        validationErrors[`assignable_${assignableId}_hourly_rate`] = `Please enter a valid hourly rate for ${assignableName}`
      }
      if (!formData[assignableId]?.start_date) {
        validationErrors[`assignable_${assignableId}_start_date`] = `Please enter a start date for ${assignableName}`
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setProcessing(false)
      toast.error("Please check the form for errors")
      return
    }

    const assignablesPayload = selectedAssignables
      .map((assignableId) => {
        const assignable = safeAssignables.find(a => a && a.id === assignableId)
        if (!assignable) {
          console.warn(`Assignable with id ${assignableId} not found`)
          return null
        }
        return {
          id: parseInt(assignableId, 10),
          type: assignable.type || 'user',
          role: formData[assignableId]?.role,
          hourly_rate: parseFloat(formData[assignableId]?.hourly_rate) || 0,
          start_date: formData[assignableId]?.start_date,
          end_date: formData[assignableId]?.end_date || null,
        }
      })
      .filter(item => item !== null) // Remove any null entries

    router.post(
      route("project-management.project-teams.store", project.id),
      { assignables: assignablesPayload },
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

  // Handle modal close and refresh
  const handleUserModalClose = () => {
    setShowNewUserModal(false);
    // Refresh the page to get updated assignables
    setTimeout(() => {
      router.reload({ only: ['teamData'], preserveScroll: true });
    }, 100);
  };

  const handleEmployeeModalClose = () => {
    setShowNewEmployeeModal(false);
    // Refresh the page to get updated assignables
    setTimeout(() => {
      router.reload({ only: ['teamData'], preserveScroll: true });
    }, 100);
  };

  return (
    <>
      {showNewUserModal && (
        <AddUser 
          setShowAddModal={handleUserModalClose}
        />
      )}
      {showNewEmployeeModal && (
        <AddEmployee 
          setShowAddModal={handleEmployeeModalClose}
        />
      )}

      <Dialog open onOpenChange={setShowAddModal}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-zinc-800">Add Team Members</DialogTitle>
          </DialogHeader>

          {/* Search + New Buttons */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
              <Input
                placeholder="Search by name, email, or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border-gray-300 rounded-lg"
              />
            </div>

            {/* <div className="flex gap-2">
              <Button
                type="button"
                className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200"
                onClick={() => setShowNewUserModal(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                New User
              </Button>
              <Button
                type="button"
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-md transition-all duration-200"
                onClick={() => setShowNewEmployeeModal(true)}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                New Employee
              </Button>
            </div> */}
          </div>

          {/* Scrollable Table */}
          <div className="max-h-[400px] overflow-y-auto border rounded-xl border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredAssignables.length > 0 &&
                        selectedAssignables.length === filteredAssignables.length
                      }
                      indeterminate={
                        selectedAssignables.length > 0 &&
                        selectedAssignables.length < filteredAssignables.length
                      }
                      onCheckedChange={(checked) => toggleSelectAll(checked)}
                    />
                  </TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider w-20">Type</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[150px]">Name</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[180px]">Email</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[200px]">
                    Role <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[130px]">
                    Hourly Rate <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[140px]">
                    Start Date <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[140px]">End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignables.map((assignable) => {
                  const isSelected = selectedAssignables.includes(assignable.id);
                  const assignableErrors = {
                    role: errors[`assignable_${assignable.id}_role`],
                    hourly_rate: errors[`assignable_${assignable.id}_hourly_rate`],
                    start_date: errors[`assignable_${assignable.id}_start_date`],
                  }

                  return (
                    <TableRow
                      key={assignable.id}
                      onClick={(e) => {
                        if (e.target.closest("input")) return;
                        handleAssignableToggle(assignable.id);
                      }}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"
                      }`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleAssignable(assignable.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>
                        {assignable.type === 'employee' ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            Employee
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            User
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{assignable.name}</TableCell>
                      <TableCell className="text-gray-700">{assignable.email || '---'}</TableCell>
                      <TableCell className="min-w-[200px]">
                        <Input
                          placeholder={assignable.role || assignable.position || "Enter role"}
                          value={formData[assignable.id]?.role || assignable.role || assignable.position || ""}
                          onChange={(e) => handleChange(assignable.id, "role", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`${inputClass(assignableErrors.role)} min-w-[180px]`}
                          required
                          title={formData[assignable.id]?.role || assignable.role || assignable.position || "Role"}
                        />
                        {assignableErrors.role && (
                          <InputError message={assignableErrors.role} className="mt-1" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formData[assignable.id]?.hourly_rate || ""}
                          onChange={(e) => handleChange(assignable.id, "hourly_rate", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={inputClass(assignableErrors.hourly_rate)}
                          required
                        />
                        {assignableErrors.hourly_rate && (
                          <InputError message={assignableErrors.hourly_rate} className="mt-1" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={formData[assignable.id]?.start_date || ""}
                          onChange={(e) => handleChange(assignable.id, "start_date", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          min={project?.start_date || undefined}
                          max={project?.planned_end_date || undefined}
                          className={inputClass(assignableErrors.start_date)}
                          required
                        />
                        {assignableErrors.start_date && (
                          <InputError message={assignableErrors.start_date} className="mt-1" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={formData[assignable.id]?.end_date || ""}
                          onChange={(e) => handleChange(assignable.id, "end_date", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          min={formData[assignable.id]?.start_date || project?.start_date || undefined}
                          max={project?.planned_end_date || undefined}
                          className="w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredAssignables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-gray-100 rounded-full p-4 mb-3">
                          <Search className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium text-base">No team members found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your search or add new users/employees</p>
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
              disabled={processing || selectedAssignables.length === 0}
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
                  Add Selected ({selectedAssignables.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
