import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, type ReactNode } from 'react';
import { locationSetupHref } from '@/lib/location/location-navigation';

export function LocationSetupLink({ section, className, children }: { section?: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return <Link href={locationSetupHref(router.asPath || router.pathname || '/today', section)} className={className}>{children}</Link>;
}

// Hashes preserve the precise section across refreshes and Back/Forward. Open
// its disclosures before scrolling, including when provider hydration is late.
export function useLocationReturnSection(id: string) {
  const { asPath } = useRouter();
  useEffect(() => {
    if (asPath?.split('#')[1] !== id) return;
    const target = document.getElementById(id);
    if (!target) return;
    let ancestor: HTMLElement | null = target;
    while (ancestor) {
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  }, [asPath, id]);
}
