const APK_URL = import.meta.env.VITE_APK_URL;

export default function ApkDownloadButton({ size = 'md' }) {
  const isLg = size === 'lg';

  return (
    <div className="flex flex-col items-start gap-1.5">
      <a
        href={APK_URL}
        download
        className={`inline-flex items-center gap-2.5 bg-charcoal-800 hover:bg-charcoal-700 active:scale-[0.98] text-white rounded-xl font-semibold transition-all duration-200 ${isLg ? 'px-6 py-3.5 text-base h-16' : 'px-5 py-3 text-sm h-14'}`}
      >
        <svg
          className={`shrink-0 ${isLg ? 'w-6 h-6' : 'w-5 h-5'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <div className="leading-tight text-left">
          <p className="uppercase tracking-wide text-[10px] text-white/50">Download for Android</p>
          <p className={isLg ? 'text-base font-semibold' : 'text-sm font-semibold'}>Get the APK</p>
        </div>
      </a>
    </div>
  );
}
