import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from "sonner";
import { AlertTriangle, Building2, Mail, Key, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog"
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';

const ResetPassword = ({ setShowResetModal, client }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);

  const defaultPassword = "clientpassword";

  const handleReset = (e) => {
    e.preventDefault();
    setProcessing(true);
    
    router.patch(route('client-management.reset-password', client.id), {}, {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowResetModal(false);
        setProcessing(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success(`Password reset successfully for "${client.client_name}"`);
        }
      },
      onError: (errors) => {
        setShowResetModal(false);
        setProcessing(false);
        if (errors.error) {
          toast.error(errors.error);
        } else {
          toast.error('Failed to reset password. Please try again.');
        }
      }
    });
  };

  return (
    <Dialog open onOpenChange={setShowResetModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-4">
              <p className="mb-4 text-sm text-gray-600">
                Are you sure you want to reset the password for <span className="font-semibold text-gray-900">{client.client_name}</span>? This action cannot be undone.
              </p>

              {/* Client Info Card */}
              <div className="p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="mb-1 font-medium text-gray-900">{client.client_name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-mono text-xs">{client.client_code}</span>
                      {client.email && (
                        <>
                          <span className="text-gray-400">•</span>
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Info */}
              <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Key className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-2 font-medium text-gray-900">New Default Password</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <Input 
                        value={showPassword ? defaultPassword : '•'.repeat(defaultPassword.length)}
                        readOnly
                        className="flex-1 font-mono text-sm bg-white border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus-visible:ring-green-500 focus-within:ring-green-500"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 transition-colors rounded-lg hover:bg-gray-200"
                        type="button"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-600" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-700">
                      The client should consider changing this password on their next login.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 border border-red-200 rounded-lg bg-red-50">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="mb-1 font-medium text-red-900">Important Notice</h4>
                  <p className="text-sm leading-relaxed text-red-700">
                    This action will immediately invalidate the client's current password.
                  </p>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row justify-end gap-2">
          <Button
            type="button"
            className="px-4 py-2 text-gray-900 transition bg-white border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-400"
            onClick={() => setShowResetModal(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex items-center gap-2 px-4 py-2 text-white transition bg-red-500 rounded hover:bg-red-600 disabled:opacity-50"
            onClick={handleReset}
            disabled={processing}
          >
            {processing && (
              <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
            )}
            {processing ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPassword;

