"use client";
 
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, Clock, X } from "lucide-react";
import Link from "next/link";
 
interface LicenseStatus {
  cancel_at_period_end: boolean;
  cancelled_during_cooling: boolean;
  access_until: string | null; // expires_at from DB
  status: string;
}
 
const EXEMPT_PATHS = ["/dashboard/display", "/dashboard/first-time-setup"];
 
export default function CancellationBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
 
  useEffect(() => {
    if (EXEMPT_PATHS.includes(pathname)) return;
    checkStatus();
  }, [pathname]);
 
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/subscription');
      if (!res.ok) return;
      const data = await res.json();
      const sub = data?.subscription;
      if (!sub) return;
 
      // Build license status from subscription response
      const status: LicenseStatus = {
        cancel_at_period_end: sub.cancel_at_period_end || false,
        cancelled_during_cooling: sub.cancelled_during_cooling || false,
        access_until: sub.cancels_at || sub.current_period_end || null,
        status: sub.status,
      };
 
      setLicenseStatus(status);
 
      // If access period has ended, redirect to /cancelled
      if (status.cancel_at_period_end && status.access_until) {
        const accessEnd = new Date(status.access_until);
        if (new Date() > accessEnd) {
          router.push('/cancelled');
        }
      }
 
      // If status is fully cancelled and no access window, redirect
      if (sub.status === 'cancelled' || sub.status === 'canceled') {
        if (!status.access_until || new Date() > new Date(status.access_until)) {
          router.push('/cancelled');
        }
      }
 
    } catch {
      // Don't block dashboard on error
    }
  };
 
  if (!licenseStatus) return null;
  if (!licenseStatus.cancel_at_period_end) return null;
  if (dismissed) return null;
  if (EXEMPT_PATHS.includes(pathname)) return null;
 
  const accessUntil = licenseStatus.access_until
    ? new Date(licenseStatus.access_until).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;
 
  const daysLeft = licenseStatus.access_until
    ? Math.max(0, Math.ceil(
        (new Date(licenseStatus.access_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : 0;
 
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            {licenseStatus.cancelled_during_cooling ? (
              <Clock className="w-4 h-4 text-amber-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-500">
            {licenseStatus.cancelled_during_cooling ? (
              <>
                <span className="font-semibold">Subscription cancelled.</span>
                {accessUntil && (
                  <> You have access until <span className="font-semibold">{accessUntil}</span>
                  {daysLeft > 0 && <> ({daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining)</>}.</>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold">Subscription ending.</span>
                {accessUntil && (
                  <> Your access ends on <span className="font-semibold">{accessUntil}</span>
                  {daysLeft > 0 && <> ({daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining)</>}.</>
                )}
              </>
            )}
          </p>
        </div>
 
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/dashboard/settings#subscription"
            className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-500 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            Reactivate
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-amber-600 hover:text-amber-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
 