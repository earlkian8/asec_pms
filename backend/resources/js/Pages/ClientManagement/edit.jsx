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
import { Input } from '@/Components/ui/input';
import InputError from '@/Components/InputError';
import { Label } from '@/Components/ui/label';
import { Button } from '@/Components/ui/button';
import { Switch } from '@/Components/ui/switch';
import { Textarea } from '@/Components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select"

const EditClient = ({ client, setShowEditModal }) => {
  const { data, setData, put, errors, processing } = useForm({
    client_code: client.client_code || '',
    client_name: client.client_name || '',
    client_type: client.client_type || '',
    contact_person: client.contact_person || '',
    email: client.email || '',
    password: '',
    phone_number: client.phone_number || '',
    address: client.address || '',
    city: client.city || '',
    province: client.province || '',
    postal_code: client.postal_code || '',
    country: client.country || '',
    tax_id: client.tax_id || '',
    business_permit: client.business_permit || '',
    credit_limit: client.credit_limit || '',
    payment_terms: client.payment_terms || '',
    is_active: client.is_active ?? true,
    notes: client.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    put(route('client-management.update', client.id), {
      onSuccess: () => {
        setShowEditModal(false);
        toast.success('Client Updated Successfully!');
      }
    });
  };

  const inputClass = (error, readOnly = false) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (readOnly
      ? "bg-zinc-100 text-zinc-600 cursor-not-allowed"
      : error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit Client</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Update the details for this client below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Client Code (Read-only) */}
          <div>
            <Label className="text-zinc-800">Client Code</Label>
            <Input
              type="text"
              value={data.client_code}
              readOnly
              className={inputClass(errors.client_code, true)}
            />
            <InputError message={errors.client_code} />
          </div>

          {/* Client Name */}
          <div>
            <Label className="text-zinc-800">Client Name</Label>
            <Input
              type="text"
              value={data.client_name}
              onChange={e => setData('client_name', e.target.value)}
              className={inputClass(errors.client_name)}
            />
            <InputError message={errors.client_name} />
          </div>

          {/* Client Type */}
          <div>
            <Label className="text-zinc-800">Client Type</Label>
            <Select
              value={data.client_type}
              onValueChange={(value) => setData("client_type", value)}
            >
              <SelectTrigger className={inputClass(errors.client_type)}>
                <SelectValue placeholder="-- Select Client Type --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="corporation">Corporation</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="ngo">NGO</SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.client_type} />
          </div>

          {/* Contact Person */}
          <div>
            <Label className="text-zinc-800">Contact Person</Label>
            <Input
              type="text"
              value={data.contact_person}
              onChange={e => setData('contact_person', e.target.value)}
              className={inputClass(errors.contact_person)}
            />
            <InputError message={errors.contact_person} />
          </div>

          {/* Email */}
          <div>
            <Label className="text-zinc-800">Email</Label>
            <Input
              type="email"
              value={data.email}
              onChange={e => setData('email', e.target.value)}
              className={inputClass(errors.email)}
            />
            <InputError message={errors.email} />
          </div>

          {/* Password */}
          <div>
            <Label className="text-zinc-800">Password</Label>
            <Input
              type="password"
              value={data.password}
              onChange={e => setData('password', e.target.value)}
              placeholder="Leave blank to keep current password"
              className={inputClass(errors.password)}
            />
            <InputError message={errors.password} />
          </div>

          {/* Phone */}
          <div>
            <Label className="text-zinc-800">Phone Number</Label>
            <Input
              type="text"
              value={data.phone_number}
              onChange={e => setData('phone_number', e.target.value)}
              className={inputClass(errors.phone_number)}
            />
            <InputError message={errors.phone_number} />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <Label className="text-zinc-800">Address</Label>
            <Input
              type="text"
              value={data.address}
              onChange={e => setData('address', e.target.value)}
              className={inputClass(errors.address)}
            />
            <InputError message={errors.address} />
          </div>

          {/* City */}
          <div>
            <Label className="text-zinc-800">City</Label>
            <Input
              type="text"
              value={data.city}
              onChange={e => setData('city', e.target.value)}
              className={inputClass(errors.city)}
            />
            <InputError message={errors.city} />
          </div>

          {/* Province */}
          <div>
            <Label className="text-zinc-800">Province</Label>
            <Input
              type="text"
              value={data.province}
              onChange={e => setData('province', e.target.value)}
              className={inputClass(errors.province)}
            />
            <InputError message={errors.province} />
          </div>

          {/* Postal Code */}
          <div>
            <Label className="text-zinc-800">Postal Code</Label>
            <Input
              type="text"
              value={data.postal_code}
              onChange={e => setData('postal_code', e.target.value)}
              className={inputClass(errors.postal_code)}
            />
            <InputError message={errors.postal_code} />
          </div>

          {/* Country */}
          <div>
            <Label className="text-zinc-800">Country</Label>
            <Input
              type="text"
              value={data.country}
              onChange={e => setData('country', e.target.value)}
              className={inputClass(errors.country)}
            />
            <InputError message={errors.country} />
          </div>

          {/* Tax ID */}
          <div>
            <Label className="text-zinc-800">Tax ID</Label>
            <Input
              type="text"
              value={data.tax_id}
              onChange={e => setData('tax_id', e.target.value)}
              className={inputClass(errors.tax_id)}
            />
            <InputError message={errors.tax_id} />
          </div>

          {/* Business Permit */}
          <div>
            <Label className="text-zinc-800">Business Permit</Label>
            <Input
              type="text"
              value={data.business_permit}
              onChange={e => setData('business_permit', e.target.value)}
              className={inputClass(errors.business_permit)}
            />
            <InputError message={errors.business_permit} />
          </div>

          {/* Credit Limit */}
          <div>
            <Label className="text-zinc-800">Credit Limit</Label>
            <Input
              type="number"
              value={data.credit_limit}
              onChange={e => setData('credit_limit', e.target.value)}
              className={inputClass(errors.credit_limit)}
            />
            <InputError message={errors.credit_limit} />
          </div>

          {/* Payment Terms */}
          <div>
            <Label className="text-zinc-800">Payment Terms</Label>
            <Input
              type="text"
              value={data.payment_terms}
              onChange={e => setData('payment_terms', e.target.value)}
              className={inputClass(errors.payment_terms)}
            />
            <InputError message={errors.payment_terms} />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <Label className="text-zinc-800">Notes</Label>
            <Textarea
              value={data.notes}
              onChange={e => setData('notes', e.target.value)}
              rows={3}
              className={inputClass(errors.notes)}
            />
            <InputError message={errors.notes} />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3 md:col-span-2">
            <Switch
              id="is_active"
              checked={data.is_active}
              onCheckedChange={(checked) => setData('is_active', checked)}
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
            />
            <Label htmlFor="is_active" className="text-zinc-800 cursor-pointer">
              {data.is_active ? 'Active' : 'Inactive'}
              <span className={`ml-2 text-xs ${data.is_active ? 'text-green-600' : 'text-red-600'}`}>
                ({data.is_active ? 'Enabled' : 'Disabled'})
              </span>
            </Label>
          </div>

          {/* Buttons */}
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4 md:col-span-2">
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

export default EditClient;
