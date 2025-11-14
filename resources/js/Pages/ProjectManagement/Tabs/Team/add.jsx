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
import AddEmployee from "@/Pages/EmployeeManagement/add"
export default function AddProjectTeam({ setShowAddModal, employees = [], project }) {
  const [search, setSearch] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [formData, setFormData] = useState({})
  const [showNewModal, setShowNewModal] = useState(false) // ✅ new modal state

  const filteredEmployees = employees.filter((e) => {
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase()
    return (
      fullName.includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
    )
  })

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedEmployees(filteredEmployees.map((e) => e.id))
    } else {
      setSelectedEmployees([])
    }
  }

  const toggleEmployee = (id) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter((eid) => eid !== id))
    } else {
      setSelectedEmployees([...selectedEmployees, id])
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

  if (selectedEmployees.length === 0) {
    toast.error("Please select at least one employee.")
    return
  }

  const employeesPayload = selectedEmployees.map((employeeId) => ({
    id: employeeId,
    role: formData[employeeId]?.role || "Member",
    hourly_rate: formData[employeeId]?.hourly_rate || null,
    start_date: formData[employeeId]?.start_date || null,
    end_date: formData[employeeId]?.end_date || null,
  }))

  router.post(
    route("project-management.project-teams.store", project.id),
    { employees: employeesPayload },
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
            placeholder="Search employees by name or email..."
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
                      filteredEmployees.length > 0 &&
                      selectedEmployees.length === filteredEmployees.length
                    }
                    indeterminate={
                      selectedEmployees.length > 0 &&
                      selectedEmployees.length < filteredEmployees.length
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
              {filteredEmployees.map((emp) => {
                const isSelected = selectedEmployees.includes(emp.id);

                return (
                  <TableRow
                    key={emp.id}
                    onClick={(e) => {
                      // Prevent toggling when clicking inside inputs/checkbox
                      if (e.target.closest("input")) return;
                      toggleEmployee(emp.id);
                    }}
                    className={`cursor-pointer transition ${
                      isSelected ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          toggleEmployee(emp.id);
                        }}
                        onClick={(e) => e.stopPropagation()} // prevent row toggle duplication
                      />
                    </TableCell>
                    <TableCell>{emp.first_name} {emp.last_name}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>
                      <Input
                        placeholder="Role"
                        value={formData[emp.id]?.role || ""}
                        onChange={(e) => handleChange(emp.id, "role", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={formData[emp.id]?.hourly_rate || ""}
                        onChange={(e) => handleChange(emp.id, "hourly_rate", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={formData[emp.id]?.start_date || ""}
                        onChange={(e) => handleChange(emp.id, "start_date", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={formData[emp.id]?.end_date || ""}
                        onChange={(e) => handleChange(emp.id, "end_date", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-gray-500">
                    No employees found
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
          <Button onClick={handleSubmit} disabled={selectedEmployees.length === 0}>
            Add Selected
          </Button>
        </DialogFooter>
      </DialogContent>

      {showNewModal && (
        <AddEmployee setShowAddModal={setShowNewModal}/>
      )}
    </Dialog>
  )
}
