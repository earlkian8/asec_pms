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
import { Loader2, Save } from 'lucide-react';

const AddEmployee = ({ setShowAddModal }) => {
  const { data, setData, post, errors, processing } = useForm({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    is_active: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route('employee-management.store'), {
      onSuccess: () => {
        setShowAddModal(false);
        toast.success('Employee Created Successfully!');
      }
    });
  };

  const inputClass = (error, readOnly = false) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (readOnly
      ? "bg-zinc-100 text-zinc-600 cursor-not-allowed"
      : error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add Employee</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Enter the details for the new employee below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* First Name */}
          <div>
            <Label className="text-zinc-800">First Name *</Label>
            <Input
              type="text"
              value={data.first_name}
              onChange={e => setData('first_name', e.target.value)}
              placeholder="First name"
              className={inputClass(errors.first_name)}
            />
            <InputError message={errors.first_name} />
          </div>

          {/* Last Name */}
          <div>
            <Label className="text-zinc-800">Last Name *</Label>
            <Input
              type="text"
              value={data.last_name}
              onChange={e => setData('last_name', e.target.value)}
              placeholder="Last name"
              className={inputClass(errors.last_name)}
            />
            <InputError message={errors.last_name} />
          </div>

          {/* Email */}
          <div>
            <Label className="text-zinc-800">Email *</Label>
            <Input
              type="email"
              value={data.email}
              onChange={e => setData('email', e.target.value)}
              placeholder="Email"
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
              placeholder="Phone number"
              className={inputClass(errors.phone)}
            />
            <InputError message={errors.phone} />
          </div>

          {/* Position */}
          <div className="md:col-span-2">
            <Label className="text-zinc-800">Position</Label>
            <Input
              type="text"
              value={data.position}
              onChange={e => setData('position', e.target.value)}
              placeholder="Position"
              className={inputClass(errors.position)}
            />
            <InputError message={errors.position} />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3 md:col-span-2">
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
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4 md:col-span-2">
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
              type="submit"
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Add Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployee;
