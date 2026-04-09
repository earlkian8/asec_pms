import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from "sonner";
import { SendHorizonal, Building2, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog";
import { Button } from '@/Components/ui/button';

const SendCredentials = ({ client, onClose }) => {
  const [processing, setProcessing] = useState(false);

  const handleSend = () => {
    setProcessing(true);
    router.post(route('client-management.send-credentials', client.id), {}, {
      preserveScroll: true,
      onSuccess: (page) => {
        onClose();
        setProcessing(false);
        const flash = page.props.flash;
        if (flash?.error) {
          toast.error(flash.error);
        } else {
          toast.success(`Credentials sent to ${client.email}`);
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
                Send login credentials to <span className="font-semibold text-gray-900">{client.client_name}</span>. A new password will be generated and emailed to them.
              </p>

              {/* Client Info Card */}
              <div className="p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="mb-1 font-medium text-gray-900">{client.client_name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                      <span className="font-mono text-xs">{client.client_code}</span>
                      {client.email && (
                        <>
                          <span className="text-gray-400">•</span>
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 border border-amber-200 rounded-lg bg-amber-50">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="mb-1 font-medium text-amber-900">Note</h4>
                  <p className="text-sm leading-relaxed text-amber-700">
                    This will generate a new password and send it to the client's email. Their current password will be invalidated.
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
