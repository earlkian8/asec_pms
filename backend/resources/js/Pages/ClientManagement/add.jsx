import { useForm } from '@inertiajs/react';
import { toast } from "sonner";
import { useState } from 'react';
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
import { Loader2, Save, Mail, KeyRound } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select"

const AddClient = ({ setShowAddModal, clientTypes }) => {
  const { data, setData, post, errors, processing } = useForm({
    client_name: '',
    client_type_id: '',
    contact_person: '',
    email: '',
    phone_number: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    country: '',
    tax_id: '',
    business_permit: '',
    credit_limit: '',
    payment_terms: '',
    is_active: true,
    notes: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!data.client_name || data.client_name.trim() === '') {
      errors.client_name = 'Client name is required';
    }
    
    if (!data.client_type_id || data.client_type_id === '') {
      errors.client_type_id = 'Client type is required';
    }
    
    if (!data.contact_person || data.contact_person.trim() === '') {
      errors.contact_person = 'Contact person is required';
    }
    
    if (!data.email || data.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getFieldError = (field) => {
    return validationErrors[field] || errors[field];
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    post(route('client-management.store'), {
      onSuccess: () => {
        setShowAddModal(false);
        setValidationErrors({});
        toast.success('Client Created Successfully!');
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
  
  const selectClass = (error) =>
    error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800";

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add Client</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Enter the details for the new client below.
          </DialogDescription>
        </DialogHeader>

        {/* Auto-password notice */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 -mt-1">
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-blue-600" />
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-blue-700 leading-relaxed">
            A <span className="font-semibold">secure password will be auto-generated</span> for this client and sent to their email address along with their login credentials. The client will be required to change their password upon first login.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">

          {/* Client Name */}
          <div>
            <Label className="text-zinc-800">Client Name <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={data.client_name}
              onChange={e => {
                setData('client_name', e.target.value);
                if (validationErrors.client_name) {
                  setValidationErrors(prev => { const n = { ...prev }; delete n.client_name; return n; });
                }
              }}
              placeholder="Client Name"
              className={inputClass(getFieldError('client_name'))}
            />
            <InputError message={getFieldError('client_name')} />
          </div>

          {/* Client Type */}
          <div>
            <Label className="text-zinc-800">Client Type <span className="text-red-500">*</span></Label>
            <Select
              value={data.client_type_id ? String(data.client_type_id) : undefined}
              onValueChange={(value) => {
                setData("client_type_id", value);
                if (validationErrors.client_type_id) {
                  setValidationErrors(prev => { const n = { ...prev }; delete n.client_type_id; return n; });
                }
              }}
            >
              <SelectTrigger className={selectClass(getFieldError('client_type_id'))}>
                <SelectValue placeholder="Select Client Type" />
              </SelectTrigger>
              <SelectContent>
                {clientTypes && clientTypes.length > 0 ? (
                  clientTypes.map(type => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-gray-500">No client types available</div>
                )}
              </SelectContent>
            </Select>
            <InputError message={getFieldError('client_type_id')} />
          </div>

          {/* Contact Person */}
          <div>
            <Label className="text-zinc-800">Contact Person <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={data.contact_person}
              onChange={e => {
                setData('contact_person', e.target.value);
                if (validationErrors.contact_person) {
                  setValidationErrors(prev => { const n = { ...prev }; delete n.contact_person; return n; });
                }
              }}
              placeholder="Contact Person"
              className={inputClass(getFieldError('contact_person'))}
            />
            <InputError message={getFieldError('contact_person')} />
          </div>

          {/* Email */}
          <div>
            <Label className="text-zinc-800">Email <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              value={data.email}
              onChange={e => {
                setData('email', e.target.value);
                if (validationErrors.email) {
                  setValidationErrors(prev => { const n = { ...prev }; delete n.email; return n; });
                }
              }}
              placeholder="Email"
              className={inputClass(getFieldError('email'))}
            />
            <InputError message={getFieldError('email')} />
          </div>

          {/* Phone */}
          <div>
            <Label className="text-zinc-800">Phone Number</Label>
            <Input
              type="text"
              value={data.phone_number}
              onChange={e => setData('phone_number', e.target.value)}
              placeholder="Phone Number"
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
              placeholder="Address"
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
              placeholder="City"
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
              placeholder="Province"
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
              placeholder="Postal Code"
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
              placeholder="Country"
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
              placeholder="Tax ID"
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
              placeholder="Business Permit"
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
              placeholder="Credit Limit"
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
              placeholder="Payment Terms"
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
              placeholder="Notes"
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
              onClick={() => setShowAddModal(false)}
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
                  Creating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Add Client
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClient;