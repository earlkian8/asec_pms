import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog";
import { Button } from '@/Components/ui/button';
import { Loader2, AlertTriangle, Trash2, ShieldAlert, Receipt } from 'lucide-react';

const DeleteBilling = ({ setShowDeleteModal, billing }) => {
  const [processing, setProcessing] = useState(false);

  const isPaid    = billing.status === 'paid';
  const isPartial = billing.status === 'partial';

  const fmt = (amount) =>
    amount ? `₱${parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '';

  const handleDelete = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.delete(route('billing-management.destroy', billing.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setProcessing(false);
        const flash = page.props.flash;
        if (flash?.error) {
          toast.error(flash.error);
        } else {
          setShowDeleteModal(false);
          toast.success(`Billing "${billing.billing_code}" deleted successfully`);
        }
      },
      onError: (errors) => {
        setProcessing(false);
        toast.error(errors.message || 'Failed to delete billing. Please try again.');
      },
    });
  };

  // ── Partial: blocked ───────────────────────────────────────────────────────
  if (isPartial) {
    return (
      <Dialog open onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 rounded-full p-2">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              </div>
              <DialogTitle className="text-amber-900">Cannot Delete Billing</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 pt-2 space-y-3">
              <p>
                Billing <span className="font-semibold text-gray-900">{billing.billing_code}</span> cannot
                be deleted because it is <span className="font-semibold text-amber-700">partially paid</span>.
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-amber-50 border-amber-200 px-3 py-2">
                <Receipt className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-700">
                  <span className="font-semibold">{fmt(billing.total_paid)}</span> of{' '}
                  <span className="font-semibold">{fmt(billing.billing_amount)}</span> already collected
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Partial payments must be <span className="font-medium text-gray-700">refunded or reversed</span> before
                this billing can be deleted.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end mt-4">
            <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}
              className="border-gray-300 hover:bg-gray-50">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Paid: allowed but warns that transactions will also be deleted ──────────
  // ── Unpaid: normal confirm ─────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">Delete Billing</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2 space-y-3">
            <p>
              Are you sure you want to delete billing{' '}
              <span className="font-semibold text-gray-900">{billing.billing_code}</span>
              {billing.billing_amount && (
                <span className="text-gray-500"> ({fmt(billing.billing_amount)})</span>
              )}?
            </p>

            {isPaid && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5">
                <p className="text-sm font-semibold text-red-700 mb-1">
                   All payment transactions will also be permanently deleted
                </p>
                <p className="text-xs text-red-600">
                  This billing is fully paid ({fmt(billing.total_paid || billing.billing_amount)}).
                  Deleting it will also remove all linked payment records — this cannot be undone.
                </p>
              </div>
            )}

            <div>
              <p className="text-sm mb-1">
                This action <span className="font-semibold text-red-600">cannot be undone</span>. The following will be permanently deleted:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Billing record ({billing.billing_code})</li>
                {isPaid && <li className="font-medium text-red-700">All linked payment transactions</li>}
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDelete}>
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
            <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}
              disabled={processing} className="border-gray-300 hover:bg-gray-50">
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={processing}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md flex items-center gap-2">
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 size={16} />{isPaid ? 'Delete Billing & Transactions' : 'Delete Billing'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteBilling;