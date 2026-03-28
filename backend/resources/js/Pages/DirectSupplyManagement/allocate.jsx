import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Textarea } from "@/Components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Loader2, PackagePlus, Truck, Building2 } from "lucide-react";

const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
        ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
        : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

const AllocateDirectSupply = ({ setShowAllocateModal, supply, projects }) => {
    const { data, setData, post, errors, processing } = useForm({
        project_id: "",
        quantity: "",
        unit_price: supply.unit_price || "",
        notes: "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route("direct-supply-management.allocate", supply.id), {
            preserveScroll: true,
            onSuccess: (page) => {
                setShowAllocateModal(false);
                const flash = page.props.flash;
                if (flash?.error) toast.error(flash.error);
                else toast.success("Supply allocated to project successfully!");
            },
            onError: () => toast.error("Please check the form for errors"),
        });
    };

    const selectedProject = projects.find((p) => String(p.id) === String(data.project_id));
    const totalCost = data.quantity && data.unit_price
        ? (parseFloat(data.quantity) * parseFloat(data.unit_price)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : null;

    return (
        <Dialog open onOpenChange={setShowAllocateModal}>
            <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-zinc-800">Allocate to Project</DialogTitle>
                    <DialogDescription className="text-zinc-600">
                        Allocate <span className="font-semibold text-zinc-800">{supply.supply_name}</span> directly from supplier to a project.
                    </DialogDescription>
                </DialogHeader>

                {/* Supply Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                        <Truck className="h-4 w-4 text-blue-700" />
                    </div>
                    <div className="text-sm">
                        <p className="font-semibold text-blue-900">{supply.supply_name}</p>
                        <p className="text-blue-700">{supply.supply_code} · {supply.supplier_name}</p>
                        <p className="text-blue-600">{supply.unit_of_measure}{supply.unit_price ? ` · ₱${parseFloat(supply.unit_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })} per ${supply.unit_of_measure}` : ""}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Project */}
                    <div className="col-span-2">
                        <Label className="text-zinc-800">Project <span className="text-red-500">*</span></Label>
                        <Select value={data.project_id} onValueChange={(v) => setData("project_id", v)}>
                            <SelectTrigger className={inputClass(errors.project_id)}>
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.length === 0 ? (
                                    <SelectItem value="none" disabled>No active projects available</SelectItem>
                                ) : (
                                    projects.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.project_code} — {p.project_name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.project_id} />
                        {selectedProject && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <Building2 className="h-3.5 w-3.5 text-gray-500" />
                                <span>{selectedProject.project_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Quantity */}
                    <div>
                        <Label className="text-zinc-800">Quantity <span className="text-red-500">*</span></Label>
                        <Input
                            type="number" step="0.01" min="0.01"
                            value={data.quantity}
                            onChange={(e) => setData("quantity", e.target.value)}
                            placeholder="0.00"
                            className={inputClass(errors.quantity)}
                        />
                        <InputError message={errors.quantity} />
                        <p className="text-xs text-gray-500 mt-1">Unit: {supply.unit_of_measure}</p>
                    </div>

                    {/* Unit Price */}
                    <div>
                        <Label className="text-zinc-800">Unit Price</Label>
                        <Input
                            type="number" step="0.01" min="0"
                            value={data.unit_price}
                            onChange={(e) => setData("unit_price", e.target.value)}
                            placeholder="0.00"
                            className={inputClass(errors.unit_price)}
                        />
                        <InputError message={errors.unit_price} />
                        <p className="text-xs text-gray-500 mt-1">Price at time of allocation</p>
                    </div>

                    {/* Total Cost Preview */}
                    {totalCost && (
                        <div className="col-span-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-green-800">Estimated Total Cost</span>
                            <span className="text-lg font-bold text-green-900">₱{totalCost}</span>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="col-span-2">
                        <Label className="text-zinc-800">Notes</Label>
                        <Textarea
                            value={data.notes}
                            onChange={(e) => setData("notes", e.target.value)}
                            placeholder="Additional notes about this allocation..."
                            className={inputClass(errors.notes)}
                            rows={3}
                        />
                        <InputError message={errors.notes} />
                    </div>

                    <DialogFooter className="col-span-2 flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => setShowAllocateModal(false)} disabled={processing}
                            className="border-gray-300 hover:bg-gray-50 transition-all duration-200">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}
                            className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 flex items-center gap-2">
                            {processing ? <><Loader2 className="h-4 w-4 animate-spin" />Allocating...</> : <><PackagePlus size={16} />Allocate Supply</>}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AllocateDirectSupply;
