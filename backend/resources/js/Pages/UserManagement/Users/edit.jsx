import { useForm } from '@inertiajs/react';
import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Eye, EyeOff, Loader2, Save } from 'lucide-react';

const EditUser = ({ setShowEditModal, user, roles }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const { data, setData, put, errors, processing } = useForm({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    password_confirmation: '',
    role: user?.roles?.[0]?.name || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    put(route('user-management.users.update', user.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowEditModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success(`User "${user.name}" updated successfully`);
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
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit User</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Update the user details. Leave password fields empty to keep the current password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">

          {/* Full Name */}
          <div>
            <Label className="text-zinc-800">Full Name</Label>
            <Input
              type="text"
              value={data.name}
              onChange={e => setData('name', e.target.value)}
              placeholder="Enter full name"
              className={inputClass(errors.name)}
            />
            <InputError message={errors.name} />
          </div>

          {/* Email */}
          <div>
            <Label className="text-zinc-800">Email Address</Label>
            <Input
              type="email"
              value={data.email}
              onChange={e => setData('email', e.target.value)}
              placeholder="Enter email address"
              className={inputClass(errors.email)}
            />
            <InputError message={errors.email} />
          </div>

          {/* Password */}
          <div>
            <Label className="text-zinc-800">New Password (Optional)</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={data.password}
                onChange={e => setData('password', e.target.value)}
                placeholder="Leave empty to keep current password"
                className={inputClass(errors.password) + " pr-12"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <InputError message={errors.password} />
          </div>

          {/* Confirm Password */}
          <div>
            <Label className="text-zinc-800">Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showPasswordConfirmation ? 'text' : 'password'}
                value={data.password_confirmation}
                onChange={e => setData('password_confirmation', e.target.value)}
                placeholder="Confirm new password"
                className={inputClass(errors.password_confirmation) + " pr-12"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
              >
                {showPasswordConfirmation ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <InputError message={errors.password_confirmation} />
          </div>

          {/* Role Selection */}
          <div>
            <Label className="text-zinc-800">Role</Label>
            <Select value={data.role} onValueChange={(value) => setData('role', value)}>
              <SelectTrigger className={inputClass(errors.role)}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.role} />
          </div>

          {/* Buttons */}
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
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
  );
};

export default EditUser;
