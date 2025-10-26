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
  Settings,
  FolderOpen
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';

interface NavItem {
  name: string
  href: string | ((projectId: string) => string)
  icon: any
  emoji: string
  requiresProject?: boolean
}

const navigationItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home, emoji: '🏠', requiresProject: false },
  { name: 'Projects', href: '/projects', icon: FolderOpen, emoji: '📁', requiresProject: false },
  { name: 'Active Sprint', href: (projectId) => `/projects/${projectId}/sprint`, icon: Rocket, emoji: '🚀', requiresProject: true },
  { name: 'Product Backlog', href: (projectId) => `/projects/${projectId}/backlog`, icon: BookOpen, emoji: '📚', requiresProject: true },
  { name: 'Sprint Planning', href: (projectId) => `/projects/${projectId}/planning`, icon: ClipboardList, emoji: '📋', requiresProject: true },
  { name: 'Reports', href: (projectId) => `/projects/${projectId}/reports`, icon: BarChart3, emoji: '📊', requiresProject: true },
  { name: 'Retrospectives', href: (projectId) => `/projects/${projectId}/retrospectives`, icon: RotateCw, emoji: '🔄', requiresProject: true },
  { name: 'Team', href: '/team', icon: Users, emoji: '👥', requiresProject: false },
  { name: 'Settings', href: '/settings', icon: Settings, emoji: '⚙️', requiresProject: false },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { selectedProject } = useProject();

  // Filter navigation items based on project selection
  const visibleNavigation = navigationItems.filter((item) => {
    // Show all items if project is selected
    if (selectedProject) return true;
    // Only show non-project items if no project selected
    return !item.requiresProject;
  });

  const getItemHref = (item: NavItem): string => {
    if (typeof item.href === 'function') {
      return selectedProject ? item.href(selectedProject.id) : '#';
    }
    return item.href;
  };

  return (
    <nav className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-content">
        {!selectedProject && (
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select a project to access more features
            </p>
          </div>
        )}
        <ul className="nav-list">
          {visibleNavigation.map((item) => {
            const itemHref = getItemHref(item);
            const isActive = pathname === itemHref ||
                           (itemHref !== '/' && itemHref !== '#' && pathname.startsWith(itemHref));

            return (
              <li key={item.name}>
                <Link
                  href={itemHref}
                  className={`nav-item ${isActive ? 'nav-item-active' : ''} ${
                    item.requiresProject && !selectedProject ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={collapsed ? item.name : undefined}
                  onClick={(e) => {
                    if (item.requiresProject && !selectedProject) {
                      e.preventDefault();
                    }
                  }}
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