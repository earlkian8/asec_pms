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
import { Loader2, Save } from 'lucide-react';

const AddRole = ({ setShowAddModal }) => {
  const { data, setData, post, errors, processing } = useForm({
    name: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route('user-management.roles-and-permissions.store'), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowAddModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success('Role Created Successfully!');
        }
      },
      onError: () => {
        toast.error("Please check the form for errors");
      },
    });
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add Role</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Enter the details for the new role below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">

          {/* Role Name */}
          <div>
            <Label className="text-zinc-800">Role Name</Label>
            <Input
              type="text"
              value={data.name}
              onChange={e => setData('name', e.target.value)}
              placeholder="Enter role name"
              className={inputClass(errors.name)}
            />
            <InputError message={errors.name} />
          </div>

          {/* Buttons */}
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
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
                  Add Role
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRole;
