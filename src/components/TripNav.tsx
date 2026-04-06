import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './TripNav.module.css';

const NAV_ITEMS = [
  { label: '🏡 TOP', href: () => `/` },
  { label: '🏠 概要', href: (tripId: string) => `/trips/${tripId}` },
  { label: '📅 スケジュール', href: (tripId: string) => `/trips/${tripId}/schedule` },
  { label: '👥 メンバー', href: (tripId: string) => `/trips/${tripId}/members` },
  { label: '💰 支払い', href: (tripId: string) => `/trips/${tripId}/payments` },
  { label: '📎 資料', href: (tripId: string) => `/trips/${tripId}/documents` },
  { label: '📍 スポット', href: (tripId: string) => `/trips/${tripId}/spots` },
  { label: '🧾 清算', href: (tripId: string) => `/trips/${tripId}/settlement` },
];

export function TripNav({ tripId }: { tripId?: string }) {
  const router = useRouter();

  if (!tripId) return null;

  return (
    <nav className={styles.nav} aria-label="Trip navigation">
      {NAV_ITEMS.map((item) => {
        const href = item.href(tripId);
        const isActive = router.asPath === href || router.asPath.startsWith(`${href}?`);
        return (
          <Link key={href} href={href} className={`${styles.link} ${isActive ? styles.active : ''}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
