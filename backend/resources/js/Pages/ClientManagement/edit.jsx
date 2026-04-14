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
import { Loader2, Save } from 'lucide-react';
import PhilippineAddressSelector from '../UserManagement/Users/PhilippineAddressSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select"

const EditClient = ({ client, setShowEditModal, clientTypes }) => {
  const { data, setData, put, errors, processing } = useForm({
    client_code: client.client_code || '',
    client_name: client.client_name || '',
    client_type_id: client.client_type_id || '',
    contact_person: client.contact_person || '',
    email: client.email || '',
    phone_number: client.phone_number || '',
    region: client.region || '',
    address: client.address || '',
    province: client.province || '',
    city_municipality: client.city_municipality || client.city || '',
    barangay: client.barangay || '',
    zip_code: client.zip_code || client.postal_code || '',
    is_active: client.is_active ?? true,
    notes: client.notes || '',
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

    put(route('client-management.update', client.id), {
      preserveScroll: true,
      preserveState: true,
      only: ['clients'],
      onSuccess: () => {
        setShowEditModal(false);
        setValidationErrors({});
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
  
  const selectClass = (error) =>
    error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800";

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
            <Label className="text-zinc-800">Client Name <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={data.client_name}
              onChange={e => {
                setData('client_name', e.target.value);
                if (validationErrors.client_name) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.client_name;
                    return newErrors;
                  });
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
              value={data.client_type_id ? String(data.client_type_id) : ''}
              onValueChange={(value) => {
                setData("client_type_id", value);
                if (validationErrors.client_type_id) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.client_type_id;
                    return newErrors;
                  });
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
                <SelectItem value="" disabled>No client types available</SelectItem>
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
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.contact_person;
                    return newErrors;
                  });
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
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                  });
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

          <div className="md:col-span-2">
            <Label className="text-zinc-800">Address</Label>
            <PhilippineAddressSelector
              value={data}
              onChange={(field, value) => setData(field, value)}
              errors={errors}
              streetKey="address"
            />
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
