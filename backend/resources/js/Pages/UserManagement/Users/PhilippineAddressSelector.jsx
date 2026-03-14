import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Loader2, MapPin, X, Search } from 'lucide-react';
import { Label } from '@/Components/ui/label';
import InputError from '@/Components/InputError';

const BASE = 'https://psgc.gitlab.io/api';

async function fetchPSGC(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`PSGC fetch failed: ${path}`);
    return res.json();
}

function PSGCSelect({ label, placeholder, value, options, onChange, disabled, loading, error }) {
    const [open, setOpen]   = useState(false);
    const [query, setQuery] = useState('');
    const ref               = useRef(null);
    const inputRef          = useRef(null);

    const filtered = query.trim()
        ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
        : options;

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen   = () => { if (disabled || loading) return; setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); };
    const handleSelect = (opt) => { onChange(opt); setOpen(false); setQuery(''); };
    const handleClear  = (e)   => { e.stopPropagation(); onChange(null); setOpen(false); };

    return (
        <div className="flex flex-col gap-1" ref={ref}>
            {label && <Label className="text-xs font-semibold text-zinc-700">{label}</Label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={handleOpen}
                    disabled={disabled || loading}
                    className={[
                        'w-full h-9 px-3 pr-8 text-sm text-left rounded-lg border transition-all flex items-center gap-2',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        open ? 'border-zinc-700 ring-1 ring-zinc-700'
                            : error ? 'border-red-400 ring-2 ring-red-100'
                            : 'border-zinc-300 hover:border-zinc-400',
                        !value ? 'text-zinc-400' : 'text-zinc-900',
                    ].join(' ')}
                >
                    {loading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400 flex-shrink-0" />
                        : <MapPin className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />}
                    <span className="flex-1 truncate">{loading ? 'Loading…' : value ? value.name : placeholder}</span>
                </button>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {value && !disabled && (
                        <button type="button" onClick={handleClear} className="p-0.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>

                {open && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
                            <Search className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={`Search ${label?.toLowerCase() || ''}…`}
                                className="flex-1 text-sm outline-none bg-transparent text-zinc-800 placeholder:text-zinc-400"
                            />
                            {query && (
                                <button type="button" onClick={() => setQuery('')} className="text-zinc-400 hover:text-zinc-600">
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                        <ul className="max-h-52 overflow-y-auto py-1">
                            {filtered.length === 0 ? (
                                <li className="px-3 py-3 text-xs text-zinc-400 text-center">No results found</li>
                            ) : filtered.map(opt => (
                                <li
                                    key={opt.code}
                                    onClick={() => handleSelect(opt)}
                                    className={[
                                        'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors',
                                        value?.code === opt.code
                                            ? 'bg-zinc-100 text-zinc-900 font-medium'
                                            : 'text-zinc-700 hover:bg-zinc-50',
                                    ].join(' ')}
                                >
                                    <MapPin className="h-3 w-3 text-zinc-300 flex-shrink-0" />
                                    {opt.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            {error && <InputError message={error} />}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
// value.region / .province / .city_municipality / .barangay are plain STRINGS.
// This component manages { code, name } objects internally for cascade fetching,
// and always emits plain name strings back up via onChange.

export default function PhilippineAddressSelector({ value = {}, onChange, errors = {}, streetKey = 'address' }) {
    const [regions,   setRegions]   = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [cities,    setCities]    = useState([]);
    const [barangays, setBarangays] = useState([]);

    const [loadingRegions,   setLoadingRegions]   = useState(false);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingCities,    setLoadingCities]    = useState(false);
    const [loadingBarangays, setLoadingBarangays] = useState(false);

    // Internal { code, name } state — used for cascade fetch triggers and display
    const [selRegion,   setSelRegion]   = useState(() => value.region            ? { code: '', name: value.region }            : null);
    const [selProvince, setSelProvince] = useState(() => value.province          ? { code: '', name: value.province }          : null);
    const [selCity,     setSelCity]     = useState(() => value.city_municipality ? { code: '', name: value.city_municipality } : null);
    const [selBarangay, setSelBarangay] = useState(() => value.barangay          ? { code: '', name: value.barangay }          : null);

    // Fetch regions on mount
    useEffect(() => {
        setLoadingRegions(true);
        fetchPSGC('/regions/')
            .then(data => setRegions(data.map(r => ({ code: r.code, name: r.name })).sort((a, b) => a.name.localeCompare(b.name))))
            .catch(console.error)
            .finally(() => setLoadingRegions(false));
    }, []);

    // Fetch provinces when region changes
    useEffect(() => {
        if (!selRegion?.code) { setProvinces([]); return; }
        setLoadingProvinces(true);
        setProvinces([]); setCities([]); setBarangays([]);
        fetchPSGC(`/regions/${selRegion.code}/provinces/`)
            .then(data => setProvinces(data.map(p => ({ code: p.code, name: p.name })).sort((a, b) => a.name.localeCompare(b.name))))
            .catch(console.error)
            .finally(() => setLoadingProvinces(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selRegion?.code]);

    // Fetch cities when province changes
    useEffect(() => {
        if (!selProvince?.code) { setCities([]); return; }
        setLoadingCities(true);
        setCities([]); setBarangays([]);
        fetchPSGC(`/provinces/${selProvince.code}/cities-municipalities/`)
            .catch(() => fetchPSGC(`/districts/${selProvince.code}/cities-municipalities/`))
            .then(data => setCities(data.map(c => ({ code: c.code, name: c.name })).sort((a, b) => a.name.localeCompare(b.name))))
            .catch(console.error)
            .finally(() => setLoadingCities(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selProvince?.code]);

    // Fetch barangays when city changes
    useEffect(() => {
        if (!selCity?.code) { setBarangays([]); return; }
        setLoadingBarangays(true);
        setBarangays([]);
        fetchPSGC(`/cities-municipalities/${selCity.code}/barangays/`)
            .then(data => setBarangays(data.map(b => ({ code: b.code, name: b.name })).sort((a, b) => a.name.localeCompare(b.name))))
            .catch(console.error)
            .finally(() => setLoadingBarangays(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selCity?.code]);

    // Handlers — update internal state (for cascading) AND emit plain string upward
    const handleRegion = (opt) => {
        setSelRegion(opt); setSelProvince(null); setSelCity(null); setSelBarangay(null);
        onChange('region', opt?.name ?? null);
        onChange('province', null); onChange('city_municipality', null); onChange('barangay', null);
    };
    const handleProvince = (opt) => {
        setSelProvince(opt); setSelCity(null); setSelBarangay(null);
        onChange('province', opt?.name ?? null);
        onChange('city_municipality', null); onChange('barangay', null);
    };
    const handleCity = (opt) => {
        setSelCity(opt); setSelBarangay(null);
        onChange('city_municipality', opt?.name ?? null);
        onChange('barangay', null);
    };
    const handleBarangay = (opt) => {
        setSelBarangay(opt);
        onChange('barangay', opt?.name ?? null);
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PSGCSelect label="Region"   placeholder="Select region"   value={selRegion}   options={regions}   onChange={handleRegion}   loading={loadingRegions}   error={errors.region} />
                <PSGCSelect label="Province" placeholder={selRegion ? 'Select province' : 'Select region first'} value={selProvince} options={provinces} onChange={handleProvince} disabled={!selRegion} loading={loadingProvinces} error={errors.province} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PSGCSelect label="City / Municipality" placeholder={selProvince ? 'Select city or municipality' : 'Select province first'} value={selCity} options={cities} onChange={handleCity} disabled={!selProvince} loading={loadingCities} error={errors.city_municipality} />
                <PSGCSelect label="Barangay" placeholder={selCity ? 'Select barangay' : 'Select city first'} value={selBarangay} options={barangays} onChange={handleBarangay} disabled={!selCity} loading={loadingBarangays} error={errors.barangay} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-col gap-1">
                    <Label className="text-xs font-semibold text-zinc-700">Street / House No. / Purok</Label>
                    <input
                        type="text"
                        value={value[streetKey] || ''}
                        onChange={e => onChange(streetKey, e.target.value)}
                        placeholder="e.g. 123 Rizal St., Purok 4"
                        className={['h-9 px-3 text-sm rounded-lg border transition-all outline-none w-full', errors[streetKey] ? 'border-red-400 ring-2 ring-red-100' : 'border-zinc-300 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700'].join(' ')}
                    />
                    {errors[streetKey] && <InputError message={errors[streetKey]} />}
                </div>
                <div className="flex flex-col gap-1">
                    <Label className="text-xs font-semibold text-zinc-700">ZIP Code</Label>
                    <input
                        type="text"
                        value={value.zip_code || ''}
                        onChange={e => onChange('zip_code', e.target.value)}
                        placeholder="0000"
                        maxLength={10}
                        className={['h-9 px-3 text-sm rounded-lg border transition-all outline-none w-full', errors.zip_code ? 'border-red-400 ring-2 ring-red-100' : 'border-zinc-300 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700'].join(' ')}
                    />
                    {errors.zip_code && <InputError message={errors.zip_code} />}
                </div>
            </div>

            {/* Summary pill — shown once all 4 levels are selected */}
            {selRegion && selProvince && selCity && selBarangay && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs text-emerald-800 leading-relaxed">
                        <span className="font-semibold">{selBarangay.name}</span>{', '}
                        {selCity.name}{', '}
                        {selProvince.name}{', '}
                        {selRegion.name}
                        {value.zip_code ? ` ${value.zip_code}` : ''}
                    </p>
                </div>
            )}
        </div>
    );
}