import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from "sonner";
import { AlertTriangle, Layers, Shield, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog"
import { Button } from '@/Components/ui/button';

const DeleteProjectType = ({ projectType, setShowDeleteModal }) => {
  const [processing, setProcessing] = useState(false);

  if (!projectType) return null;

  const hasProjects = (projectType.projects_count || 0) > 0;

  const handleDelete = (e) => {
    e.preventDefault();
    if (hasProjects) return;

    setProcessing(true);
    router.delete(route('project-type-management.destroy', projectType.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setProcessing(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          setShowDeleteModal(false);
          toast.success(`Project type "${projectType.name}" deleted successfully`);
        }
      },
      onError: (errors) => {
        setProcessing(false);
        const errorMessage = errors?.message || errors?.error?.[0] || errors?.error || (typeof errors === 'string' ? errors : null);
        toast.error(errorMessage || 'Failed to delete project type. Please try again.');
      }
    });
  };

  // Blocked — has projects
  if (hasProjects) {
    return (
      <Dialog open onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 rounded-full p-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-red-900">Cannot Delete Project Type</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 pt-2">
              <div className="space-y-4">
                <p className="text-sm">
                  The project type <span className="font-semibold text-gray-900">{projectType.name}</span> cannot be deleted because it is currently in use.
                </p>

                {/* Warning Info Card */}
                <div className="p-4 border border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-red-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Shield className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="mb-1 font-medium text-red-900">Deletion Blocked</h4>
                      <p className="text-sm text-red-700">
                        This project type is assigned to <span className="font-semibold">{projectType.projects_count}</span> project{projectType.projects_count !== 1 ? 's' : ''} and cannot be removed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Layers className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-2 font-medium text-blue-900">What you can do instead</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Reassign all related projects to a different type</li>
                        <li>• Set this project type to <span className="font-medium">Inactive</span> to hide it</li>
                        <li>• Delete all associated projects first, then retry</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md transition-all duration-200"
              onClick={() => setShowDeleteModal(false)}
            >
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Normal delete confirmation
  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">Delete Project Type</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete the project type{" "}
            <span className="font-semibold text-gray-900">{projectType.name}</span>?
            <br /><br />
            This action <span className="font-semibold text-red-600">cannot be undone</span> and all associated data will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDelete} className="flex flex-col gap-4">
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={processing}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={processing}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Project Type
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProjectType;