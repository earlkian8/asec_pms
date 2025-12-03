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
import { Button } from '@/Components/ui/button';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';

const DeleteProjectType = ({ projectType, setShowDeleteModal }) => {
  if (!projectType) {
    return null;
  }

  const { delete: destroy, processing } = useForm({});

  const handleDelete = () => {
    destroy(route('project-type-management.destroy', projectType.id), {
      preserveScroll: true,
      preserveState: true,
      only: ['projectTypes'],
      onSuccess: () => {
        setShowDeleteModal(false);
        toast.success('Project type deleted successfully!');
      },
      onError: (errors) => {
        if (errors.message) {
          toast.error(errors.message);
        } else {
          toast.error('Failed to delete project type.');
        }
      }
    });
  };

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
            This action <span className="font-semibold text-red-600">cannot be undone</span>.
            {(projectType.projects_count || 0) > 0 && (
              <>
                <br /><br />
                <span className="text-red-600 font-semibold">
                  Warning: This project type is currently used by {projectType.projects_count} project(s) and cannot be deleted.
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); handleDelete(); }} className="flex flex-col gap-4">
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
              disabled={processing || ((projectType.projects_count || 0) > 0)}
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

