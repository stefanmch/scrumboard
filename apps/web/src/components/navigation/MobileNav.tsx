"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ClipboardList, Users, BarChart3, Settings } from 'lucide-react';

const mobileNavigation = [
  { name: 'Home', href: '/', icon: Home, emoji: '🏠' },
  { name: 'Sprint', href: '/sprint', icon: ClipboardList, emoji: '📋' },
  { name: 'Team', href: '/team', icon: Users, emoji: '👥' },
  { name: 'Reports', href: '/reports', icon: BarChart3, emoji: '📊' },
  { name: 'Settings', href: '/settings', icon: Settings, emoji: '⚙️' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-container">
        {mobileNavigation.map((item) => {
          const isActive = pathname === item.href ||
                         (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`mobile-nav-item ${isActive ? 'mobile-nav-item-active' : ''}`}
            >
              <span className="mobile-nav-icon">{item.emoji}</span>
              <span className="mobile-nav-label">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}