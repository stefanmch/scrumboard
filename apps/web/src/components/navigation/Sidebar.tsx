"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Rocket,
  BookOpen,
  ClipboardList,
  Users,
  BarChart3,
  RotateCw,
  Settings
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, emoji: '🏠' },
  { name: 'Active Sprint', href: '/sprint', icon: Rocket, emoji: '🚀' },
  { name: 'Product Backlog', href: '/backlog', icon: BookOpen, emoji: '📚' },
  { name: 'Sprint Planning', href: '/planning', icon: ClipboardList, emoji: '📋' },
  { name: 'Team', href: '/team', icon: Users, emoji: '👥' },
  { name: 'Reports', href: '/reports', icon: BarChart3, emoji: '📊' },
  { name: 'Retrospectives', href: '/retrospectives', icon: RotateCw, emoji: '🔄' },
  { name: 'Settings', href: '/settings', icon: Settings, emoji: '⚙️' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-content">
        <ul className="nav-list">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
                           (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                  title={collapsed ? item.name : undefined}
                >
                  <span className="nav-item-icon">
                    {item.emoji}
                  </span>
                  {!collapsed && (
                    <span className="nav-item-text">{item.name}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}