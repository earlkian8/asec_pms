import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Textarea } from "@/Components/ui/textarea";
import { Switch } from "@/Components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Loader2, Truck } from "lucide-react";

const CATEGORIES = [
    "Construction Materials", "Electrical", "Plumbing",
    "Tools & Equipment", "Safety Equipment", "Office Supplies",
    "Mechanical", "Civil Works", "Finishing Materials", "Others",
];

const UNITS = [
    "pieces", "kg", "meters", "liters", "boxes", "rolls", "units",
    "packs", "sets", "tons", "gallons", "square meters", "cubic meters",
    "feet", "yards", "pounds", "bags", "cartons", "bundles", "sheets",
];

const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
        ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
        : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

const AddDirectSupply = ({ setShowAddModal }) => {
    const { data, setData, post, errors, processing } = useForm({
        supply_name: "",
        description: "",
        category: "",
        unit_of_measure: "pieces",
        unit_price: "",
        supplier_name: "",
        supplier_contact: "",
        is_active: true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route("direct-supply-management.store"), {
            preserveScroll: true,
            onSuccess: (page) => {
                setShowAddModal(false);
                const flash = page.props.flash;
                if (flash?.error) toast.error(flash.error);
                else toast.success("Direct supply created successfully!");
            },
            onError: () => toast.error("Please check the form for errors"),
        });
    };

    return (
        <Dialog open onOpenChange={setShowAddModal}>
            <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-zinc-800">Add New Direct Supply</DialogTitle>
                    <DialogDescription className="text-zinc-600">
                        Register a new direct supply item from a supplier.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Supply Name */}
                    <div className="col-span-2">
                        <Label className="text-zinc-800">Supply Name <span className="text-red-500">*</span></Label>
                        <Input
                            type="text"
                            value={data.supply_name}
                            onChange={(e) => setData("supply_name", e.target.value)}
                            placeholder="Enter supply name"
                            className={inputClass(errors.supply_name)}
                        />
                        <InputError message={errors.supply_name} />
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                        <Label className="text-zinc-800">Description</Label>
                        <Textarea
                            value={data.description}
                            onChange={(e) => setData("description", e.target.value)}
                            placeholder="Enter supply description"
                            className={inputClass(errors.description)}
                            rows={3}
                        />
                        <InputError message={errors.description} />
                    </div>

                    {/* Category */}
                    <div>
                        <Label className="text-zinc-800">Category</Label>
                        <Select value={data.category} onValueChange={(v) => setData("category", v)}>
                            <SelectTrigger className={inputClass(errors.category)}>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.category} />
                    </div>

                    {/* Unit of Measure */}
                    <div>
                        <Label className="text-zinc-800">Unit of Measure <span className="text-red-500">*</span></Label>
                        <Select value={data.unit_of_measure} onValueChange={(v) => setData("unit_of_measure", v)}>
                            <SelectTrigger className={inputClass(errors.unit_of_measure)}>
                                <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                                {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.unit_of_measure} />
                    </div>

                    {/* Unit Price */}
                    <div>
                        <Label className="text-zinc-800">Unit Price <span className="text-red-500">*</span></Label>
                        <Input
                            type="number" step="0.01" min="0"
                            value={data.unit_price}
                            onChange={(e) => setData("unit_price", e.target.value)}
                            placeholder="0.00"
                            className={inputClass(errors.unit_price)}
                        />
                        <InputError message={errors.unit_price} />
                        <p className="text-xs text-gray-500 mt-1">Estimated unit price from supplier</p>
                    </div>

                    {/* Supplier Name */}
                    <div>
                        <Label className="text-zinc-800">Supplier Name <span className="text-red-500">*</span></Label>
                        <Input
                            type="text"
                            value={data.supplier_name}
                            onChange={(e) => setData("supplier_name", e.target.value)}
                            placeholder="Enter supplier name"
                            className={inputClass(errors.supplier_name)}
                        />
                        <InputError message={errors.supplier_name} />
                    </div>

                    {/* Supplier Contact */}
                    <div className="col-span-2">
                        <Label className="text-zinc-800">Supplier Contact</Label>
                        <Input
                            type="text"
                            value={data.supplier_contact}
                            onChange={(e) => setData("supplier_contact", e.target.value)}
                            placeholder="Phone number, email, or address"
                            className={inputClass(errors.supplier_contact)}
                        />
                        <InputError message={errors.supplier_contact} />
                    </div>

                    {/* Is Active */}
                    <div className="col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Switch
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData("is_active", checked)}
                            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                        />
                        <Label htmlFor="is_active" className="cursor-pointer text-zinc-800">
                            {data.is_active ? "Active" : "Inactive"}
                            <span className={`ml-2 text-xs font-medium ${data.is_active ? "text-green-600" : "text-red-600"}`}>
                                ({data.is_active ? "Supply will be available for allocation" : "Supply will be disabled"})
                            </span>
                        </Label>
                    </div>

                    <DialogFooter className="col-span-2 flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} disabled={processing}
                            className="border-gray-300 hover:bg-gray-50 transition-all duration-200">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}
                            className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 flex items-center gap-2">
                            {processing ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : <><Truck size={16} />Create Supply</>}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddDirectSupply;
