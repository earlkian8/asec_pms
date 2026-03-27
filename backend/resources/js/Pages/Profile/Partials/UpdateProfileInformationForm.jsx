import { useForm } from '@inertiajs/react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Input } from '@/Components/ui/input';
import InputError from '@/Components/InputError';
import { Label } from '@/Components/ui/label';
import { Button } from '@/Components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import {
    Eye, EyeOff, Loader2, Save, ChevronRight, ChevronLeft,
    Lock, User, Phone, CreditCard, Camera, Upload, X, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import PhilippineAddressSelector from '@/Pages/UserManagement/Users/PhilippineAddressSelector';

const TABS = [
    { id: 'account',   label: 'Account',   icon: Lock       },
    { id: 'personal',  label: 'Personal',  icon: User       },
    { id: 'emergency', label: 'Emergency', icon: Phone      },
    { id: 'govids',    label: 'Gov IDs',   icon: CreditCard },
];

const TAB_FIELDS = {
    account:   ['first_name', 'middle_name', 'last_name', 'email', 'current_password', 'password', 'password_confirmation'],
    personal:  ['profile_image', 'phone', 'secondary_phone', 'gender', 'date_of_birth',
                 'civil_status', 'nationality', 'region', 'province', 'city_municipality',
                 'barangay', 'address', 'zip_code', 'notes'],
    emergency: ['emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone'],
    govids:    ['sss_number', 'sss_id_image', 'philhealth_number', 'philhealth_id_image',
                 'pagibig_number', 'pagibig_id_image', 'tin_number', 'tin_id_image'],
};

const inputClass = (error) =>
    'w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 ' +
    (error
        ? 'border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500'
        : 'border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800');

// ── Gov ID row ────────────────────────────────────────────────────────────────
function GovIdRow({ label, numberKey, imageKey, data, setData, errors, existingImageUrl }) {
    const fileRef = useRef(null);
    const [preview, setPreview] = useState(existingImageUrl || null);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setData(imageKey, file);
        setPreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        setData(imageKey, null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <Label className="text-zinc-800">ID Number</Label>
                    <Input
                        value={data[numberKey]}
                        onChange={e => setData(numberKey, e.target.value)}
                        placeholder={`Enter ${label} number`}
                        className={inputClass(errors[numberKey])}
                    />
                    <InputError message={errors[numberKey]} />
                </div>
                <div>
                    <Label className="text-zinc-800">ID Image</Label>
                    <div className="flex items-center gap-2 mt-1">
                        {preview && (
                            <div className="relative flex-shrink-0">
                                <img src={preview} alt={`${label} ID`} className="h-9 w-16 object-cover rounded-lg border border-zinc-200" />
                                <button type="button" onClick={clearImage} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-1.5 text-xs border border-dashed border-zinc-400 text-zinc-600 rounded-lg px-3 h-9 hover:bg-zinc-100 hover:border-zinc-500 transition-colors"
                        >
                            <Upload className="h-3.5 w-3.5" />
                            {preview ? 'Replace' : 'Upload'}
                        </button>
                        <input ref={fileRef} type="file" accept="image/jpg,image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
                    </div>
                    <InputError message={errors[imageKey]} />
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UpdateProfileInformationForm({ user, status }) {
    const [activeTab, setActiveTab]   = useState('account');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew]         = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(user?.profile_image_url || null);
    const avatarRef = useRef(null);

    const { data, setData, post, errors, processing, recentlySuccessful } = useForm({
        _method: 'POST',

        // Account
        first_name:            user?.first_name  || '',
        middle_name:           user?.middle_name || '',
        last_name:             user?.last_name   || '',
        email:                 user?.email       || '',
        current_password:      '',
        password:              '',
        password_confirmation: '',

        // Personal
        profile_image:   null,
        phone:           user?.phone           || '',
        secondary_phone: user?.secondary_phone || '',
        gender:          user?.gender          || '',
        date_of_birth:   user?.date_of_birth   ? String(user.date_of_birth).slice(0, 10) : '',
        civil_status:    user?.civil_status    || '',
        nationality:     user?.nationality     || '',

        // Address
        region:            user?.region            || '',
        province:          user?.province          || '',
        city_municipality: user?.city_municipality || '',
        barangay:          user?.barangay          || '',
        address:           user?.address           || '',
        zip_code:          user?.zip_code          || '',

        // Emergency
        emergency_contact_name:         user?.emergency_contact_name         || '',
        emergency_contact_relationship: user?.emergency_contact_relationship || '',
        emergency_contact_phone:        user?.emergency_contact_phone        || '',

        // Gov IDs
        sss_number:          user?.sss_number        || '',
        sss_id_image:        null,
        philhealth_number:   user?.philhealth_number || '',
        philhealth_id_image: null,
        pagibig_number:      user?.pagibig_number    || '',
        pagibig_id_image:    null,
        tin_number:          user?.tin_number        || '',
        tin_id_image:        null,

        notes: user?.notes || '',
    });

    const tabHasError = (tabId) => (TAB_FIELDS[tabId] || []).some(k => errors[k]);
    const tabIndex    = TABS.findIndex(t => t.id === activeTab);

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setData('profile_image', file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Profile updated successfully');
                // Clear password fields after save
                setData(prev => ({ ...prev, current_password: '', password: '', password_confirmation: '' }));
            },
            onError: () => {
                toast.error('Please check the form for errors');
                const firstErrorTab = TABS.find(t => (TAB_FIELDS[t.id] || []).some(k => errors[k]));
                if (firstErrorTab) setActiveTab(firstErrorTab.id);
            },
        });
    };

    return (
        <section>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100">
                <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Update your account's profile information, address, and government IDs.
                </p>
                {status === 'profile-updated' && (
                    <p className="mt-2 text-sm font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Saved successfully.
                    </p>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200 overflow-x-auto px-6">
                {TABS.map((tab) => {
                    const Icon     = tab.icon;
                    const hasErr   = tabHasError(tab.id);
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={[
                                'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-all',
                                isActive ? 'border-zinc-800 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700',
                            ].join(' ')}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                            {hasErr && (
                                <span className="bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">!</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="px-6 py-5 space-y-4 min-h-[320px]">

                    {/* ── ACCOUNT ─────────────────────────────────────────── */}
                    {activeTab === 'account' && (
                        <div className="grid grid-cols-1 gap-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Full Name</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-800">First Name <span className="text-red-500">*</span></Label>
                                    <Input value={data.first_name} onChange={e => setData('first_name', e.target.value)} placeholder="e.g. Juan" className={inputClass(errors.first_name)} />
                                    <InputError message={errors.first_name} />
                                </div>
                                <div>
                                    <Label className="text-zinc-800">Middle Name <span className="text-zinc-400 font-normal text-xs">(optional)</span></Label>
                                    <Input value={data.middle_name} onChange={e => setData('middle_name', e.target.value)} placeholder="e.g. Domingo" className={inputClass(errors.middle_name)} />
                                    <InputError message={errors.middle_name} />
                                </div>
                            </div>
                            <div>
                                <Label className="text-zinc-800">Last Name <span className="text-red-500">*</span></Label>
                                <Input value={data.last_name} onChange={e => setData('last_name', e.target.value)} placeholder="e.g. Dela Cruz" className={inputClass(errors.last_name)} />
                                <InputError message={errors.last_name} />
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-2">Email</p>
                            <div>
                                <Label className="text-zinc-800">Email Address <span className="text-red-500">*</span></Label>
                                <Input type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="you@company.com" className={inputClass(errors.email)} />
                                <InputError message={errors.email} />
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-2">Change Password <span className="text-zinc-300 font-normal normal-case tracking-normal">(leave blank to keep current)</span></p>

                            <div>
                                <Label className="text-zinc-800">Current Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showCurrent ? 'text' : 'password'}
                                        value={data.current_password}
                                        onChange={e => setData('current_password', e.target.value)}
                                        placeholder="Enter current password"
                                        className={inputClass(errors.current_password) + ' pr-12'}
                                        autoComplete="current-password"
                                    />
                                    <Button type="button" variant="ghost" size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowCurrent(v => !v)}>
                                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <InputError message={errors.current_password} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-800">New Password <span className="text-zinc-400 font-normal text-xs">(optional)</span></Label>
                                    <div className="relative">
                                        <Input
                                            type={showNew ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={e => setData('password', e.target.value)}
                                            placeholder="Enter new password"
                                            className={inputClass(errors.password) + ' pr-12'}
                                            autoComplete="new-password"
                                        />
                                        <Button type="button" variant="ghost" size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowNew(v => !v)}>
                                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <InputError message={errors.password} />
                                </div>
                                <div>
                                    <Label className="text-zinc-800">Confirm New Password</Label>
                                    <div className="relative">
                                        <Input
                                            type={showConfirm ? 'text' : 'password'}
                                            value={data.password_confirmation}
                                            onChange={e => setData('password_confirmation', e.target.value)}
                                            placeholder="Confirm new password"
                                            className={inputClass(errors.password_confirmation) + ' pr-12'}
                                            autoComplete="new-password"
                                        />
                                        <Button type="button" variant="ghost" size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowConfirm(v => !v)}>
                                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <InputError message={errors.password_confirmation} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── PERSONAL ────────────────────────────────────────── */}
                    {activeTab === 'personal' && (
                        <div className="grid grid-cols-1 gap-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Profile Photo</p>

                            <div className="flex items-center gap-4">
                                <div className="relative flex-shrink-0">
                                    <div className="h-20 w-20 rounded-full border-2 border-zinc-200 bg-zinc-100 overflow-hidden flex items-center justify-center">
                                        {avatarPreview
                                            ? <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                                            : <User className="h-8 w-8 text-zinc-400" />}
                                    </div>
                                    <button type="button" onClick={() => avatarRef.current?.click()}
                                        className="absolute bottom-0 right-0 bg-zinc-800 text-white rounded-full p-1.5 hover:bg-zinc-700 shadow">
                                        <Camera className="h-3 w-3" />
                                    </button>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-800">Upload Photo</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">JPG, PNG or WebP · max 2 MB</p>
                                    {avatarPreview && (
                                        <button type="button" onClick={() => { setAvatarPreview(null); setData('profile_image', null); }}
                                            className="text-xs text-red-500 hover:text-red-700 mt-1 flex items-center gap-1">
                                            <X className="h-3 w-3" /> Remove
                                        </button>
                                    )}
                                </div>
                                <input ref={avatarRef} type="file" accept="image/jpg,image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                            </div>
                            <InputError message={errors.profile_image} />

                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Personal Details</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-800">Primary Phone</Label>
                                    <Input value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="+63 9XX XXX XXXX" className={inputClass(errors.phone)} />
                                    <InputError message={errors.phone} />
                                </div>
                                <div>
                                    <Label className="text-zinc-800">Secondary Phone</Label>
                                    <Input value={data.secondary_phone} onChange={e => setData('secondary_phone', e.target.value)} placeholder="+63 9XX XXX XXXX" className={inputClass(errors.secondary_phone)} />
                                    <InputError message={errors.secondary_phone} />
                                </div>
                                <div>
                                    <Label className="text-zinc-800">Gender</Label>
                                    <Select value={data.gender} onValueChange={v => setData('gender', v)}>
                                        <SelectTrigger className={inputClass(errors.gender)}><SelectValue placeholder="Select gender" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.gender} />
                                </div>
                                <div>
                                    <Label className="text-zinc-800">Date of Birth</Label>
                                    <Input type="date" value={data.date_of_birth} onChange={e => setData('date_of_birth', e.target.value)} className={inputClass(errors.date_of_birth)} />
                                    <InputError message={errors.date_of_birth} />
                                </div>
                                <div>
                                    <Label className="text-zinc-800">Civil Status</Label>
                                    <Select value={data.civil_status} onValueChange={v => setData('civil_status', v)}>
                                        <SelectTrigger className={inputClass(errors.civil_status)}><SelectValue placeholder="Select status" /></SelectTrigger>
                                        <SelectContent>
                                            {['single', 'married', 'widowed', 'separated', 'divorced'].map(s => (
                                                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.civil_status} />
                                </div>
                                <div>
                                    <Label className="text-zinc-800">Nationality</Label>
                                    <Input value={data.nationality} onChange={e => setData('nationality', e.target.value)} placeholder="e.g. Filipino" className={inputClass(errors.nationality)} />
                                    <InputError message={errors.nationality} />
                                </div>
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-2">Address</p>
                            <PhilippineAddressSelector
                                value={data}
                                onChange={(field, val) => setData(field, val)}
                                errors={errors}
                                streetKey="address"
                            />

                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-2">Notes</p>
                            <div>
                                <Label className="text-zinc-800">Notes / Remarks</Label>
                                <Textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Any additional information…"
                                    rows={3}
                                    className={'w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 resize-none ' + (errors.notes ? 'border-red-500 ring-2 ring-red-400' : 'border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800')}
                                />
                                <InputError message={errors.notes} />
                            </div>
                        </div>
                    )}

                    {/* ── EMERGENCY ───────────────────────────────────────── */}
                    {activeTab === 'emergency' && (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-800">This information is only used in case of emergency. Please keep it accurate and up to date.</p>
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Emergency Contact</p>

                            <div>
                                <Label className="text-zinc-800">Contact Name</Label>
                                <Input value={data.emergency_contact_name} onChange={e => setData('emergency_contact_name', e.target.value)} placeholder="Full name" className={inputClass(errors.emergency_contact_name)} />
                                <InputError message={errors.emergency_contact_name} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-800">Relationship</Label>
                                    <Input value={data.emergency_contact_relationship} onChange={e => setData('emergency_contact_relationship', e.target.value)} placeholder="e.g. Spouse, Parent, Sibling" className={inputClass(errors.emergency_contact_relationship)} />
                                    <InputError message={errors.emergency_contact_relationship} />
                                </div>
                                <div>
                                    <Label className="text-zinc-800">Contact Phone</Label>
                                    <Input value={data.emergency_contact_phone} onChange={e => setData('emergency_contact_phone', e.target.value)} placeholder="+63 9XX XXX XXXX" className={inputClass(errors.emergency_contact_phone)} />
                                    <InputError message={errors.emergency_contact_phone} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── GOV IDs ─────────────────────────────────────────── */}
                    {activeTab === 'govids' && (
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <CreditCard className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-blue-800">Government ID images are stored securely. Accepted formats: JPG, PNG, WebP · max 5 MB each.</p>
                            </div>
                            <GovIdRow label="SSS"        numberKey="sss_number"        imageKey="sss_id_image"        data={data} setData={setData} errors={errors} existingImageUrl={user?.sss_id_image_url} />
                            <GovIdRow label="PhilHealth" numberKey="philhealth_number"  imageKey="philhealth_id_image" data={data} setData={setData} errors={errors} existingImageUrl={user?.philhealth_id_image_url} />
                            <GovIdRow label="Pag-IBIG"   numberKey="pagibig_number"     imageKey="pagibig_id_image"    data={data} setData={setData} errors={errors} existingImageUrl={user?.pagibig_id_image_url} />
                            <GovIdRow label="TIN"        numberKey="tin_number"         imageKey="tin_id_image"        data={data} setData={setData} errors={errors} existingImageUrl={user?.tin_id_image_url} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 rounded-b-lg">
                    <div className="flex gap-2">
                        {tabIndex > 0 && (
                            <Button type="button" variant="outline" size="sm" className="border-zinc-300 h-9 flex items-center gap-1"
                                onClick={() => setActiveTab(TABS[tabIndex - 1].id)}>
                                <ChevronLeft className="h-3.5 w-3.5" /> Back
                            </Button>
                        )}
                        {tabIndex < TABS.length - 1 && (
                            <Button type="button" variant="outline" size="sm" className="border-zinc-300 h-9 flex items-center gap-1"
                                onClick={() => setActiveTab(TABS[tabIndex + 1].id)}>
                                Next <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                    <Button
                        type="submit"
                        disabled={processing}
                        className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                    >
                        {processing
                            ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                            : <><Save className="h-4 w-4" />Save Changes</>
                        }
                    </Button>
                </div>
            </form>
        </section>
    );
}
