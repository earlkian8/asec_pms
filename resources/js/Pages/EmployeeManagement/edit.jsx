import { useForm } from '@inertiajs/react';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog"
import { Input } from '@/Components/ui/input';
import InputError from '@/Components/InputError';
import { Label } from '@/Components/ui/label';
import { Button } from '@/Components/ui/button';
import { Switch } from '@/Components/ui/switch';

const EditEmployee = ({ setShowEditModal, employee }) => {
  const { data, setData, put, errors, processing } = useForm({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    position: employee?.position || '',
    is_active: employee?.is_active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    put(route('employee-management.update', employee.id), {
      onSuccess: () => {
        setShowEditModal(false);
        toast.success('Employee Updated Successfully!');
      }
    });
  };

  // ✅ Reusable input style with error handling
  const inputClass = (error, readOnly = false) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (readOnly
      ? "bg-zinc-100 text-zinc-600 cursor-not-allowed"
      : error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit Employee</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Update the details for <span className="font-semibold">{employee?.first_name} {employee?.last_name}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">

          {/* First Name */}
          <div>
            <Label className="text-zinc-800">First Name</Label>
            <Input
              type="text"
              value={data.first_name}
              onChange={e => setData('first_name', e.target.value)}
              placeholder="Enter first name"
              className={inputClass(errors.first_name)}
            />
            <InputError message={errors.first_name} />
          </div>

          {/* Last Name */}
          <div>
            <Label className="text-zinc-800">Last Name</Label>
            <Input
              type="text"
              value={data.last_name}
              onChange={e => setData('last_name', e.target.value)}
              placeholder="Enter last name"
              className={inputClass(errors.last_name)}
            />
            <InputError message={errors.last_name} />
          </div>

          {/* Email */}
          <div>
            <Label className="text-zinc-800">Email</Label>
            <Input
              type="email"
              value={data.email}
              onChange={e => setData('email', e.target.value)}
              placeholder="Enter email address"
              className={inputClass(errors.email)}
            />
            <InputError message={errors.email} />
          </div>

          {/* Phone */}
          <div>
            <Label className="text-zinc-800">Phone</Label>
            <Input
              type="text"
              value={data.phone}
              onChange={e => setData('phone', e.target.value)}
              placeholder="Enter phone number"
              className={inputClass(errors.phone)}
            />
            <InputError message={errors.phone} />
          </div>

          {/* Position */}
          <div>
            <Label className="text-zinc-800">Position</Label>
            <Input
              type="text"
              value={data.position}
              onChange={e => setData('position', e.target.value)}
              placeholder="Enter job position"
              className={inputClass(errors.position)}
            />
            <InputError message={errors.position} />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={data.is_active}
              onCheckedChange={(checked) => setData('is_active', checked)}
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
            />
            <Label htmlFor="is_active" className="text-zinc-800 cursor-pointer">
              {data.is_active ? 'Active' : 'Inactive'}
              <span className={`ml-2 text-xs ${data.is_active ? 'text-green-600' : 'text-red-600'}`}>
                ({data.is_active ? 'Enabled' : 'Disabled'})
              </span>
            </Label>
          </div>

          {/* Buttons */}
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
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
              Update Employee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployee;
