import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from "sonner";
import { SendHorizonal, User, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog";
import { Button } from '@/Components/ui/button';

const SendCredentials = ({ user, onClose }) => {
  const [processing, setProcessing] = useState(false);

  const fullName = [user?.first_name, user?.middle_name ? user.middle_name.charAt(0) + '.' : null, user?.last_name]
    .filter(Boolean).join(' ');

  const handleSend = () => {
    setProcessing(true);
    router.post(route('user-management.users.send-credentials', user.id), {}, {
      preserveScroll: true,
      onSuccess: (page) => {
        onClose();
        setProcessing(false);
        const flash = page.props.flash;
        if (flash?.error) {
          toast.error(flash.error);
        } else {
          toast.success(`Credentials sent to ${user.email}`);
        }
      },
      onError: () => {
        onClose();
        setProcessing(false);
        toast.error('Failed to send credentials. Please try again.');
      },
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SendHorizonal className="w-5 h-5 text-blue-600" />
            Send Credentials
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-600">
                Send login credentials to <span className="font-semibold text-gray-900">{fullName}</span>. A new password will be generated and emailed to them.
              </p>

              {/* User Info Card */}
              <div className="p-4 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="mb-1 font-medium text-gray-900">{fullName}</h4>
                    {user?.email && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 border border-amber-200 rounded-lg bg-amber-50">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="mb-1 font-medium text-amber-900">Note</h4>
                  <p className="text-sm leading-relaxed text-amber-700">
                    This will generate a new password and send it to the user's email. Their current password will be invalidated.
                  </p>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={processing}
            className="border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={processing}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <SendHorizonal size={16} />
                Send Credentials
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendCredentials;
