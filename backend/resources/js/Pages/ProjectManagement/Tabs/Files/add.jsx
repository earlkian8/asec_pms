import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { useRef, useState } from "react";

export default function AddFileModal({ open, setOpen, projectId, onSuccess }) {
    const { data, setData, post, processing, reset, errors } = useForm({
        file: null,
        description: "",
        category: "other",
    });

    const fileInputRef = useRef(null);
    const [previewName, setPreviewName] = useState("");

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData("file", file);
            setPreviewName(file.name);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route("project-management.project-files.store", projectId), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("File uploaded successfully!");
                reset();
                setPreviewName("");
                setOpen(false);
                if (onSuccess) onSuccess();
            },
            onError: () => {
                toast.error("Something went wrong while uploading file.");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Project File</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* File Upload */}
                    <div>
                        <label className="text-sm font-medium">Upload File</label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="text"
                                readOnly
                                value={previewName}
                                placeholder="No file selected"
                                className="flex-1 cursor-pointer"
                                onClick={() => fileInputRef.current.click()}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current.click()}
                            >
                                Browse
                            </Button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium">Description</label>
                        <Input
                            type="text"
                            value={data.description}
                            onChange={(e) => setData("description", e.target.value)}
                            placeholder="Optional description"
                        />
                        {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-sm font-medium">Category</label>
                        <select
                            value={data.category}
                            onChange={(e) => setData("category", e.target.value)}
                            className="w-full border rounded-md p-2 text-sm"
                        >
                            <option value="contract">Contract</option>
                            <option value="drafting">Drafting</option>
                            <option value="specification">Specification</option>
                            <option value="report">Report</option>
                            <option value="photo">Photo</option>
                            <option value="other">Other</option>
                        </select>
                        {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
                    </div>

                    {/* Actions */}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? "Uploading..." : "Upload"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
