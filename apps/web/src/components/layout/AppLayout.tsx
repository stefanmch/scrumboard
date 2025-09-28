"use client";

import { useState, useEffect } from 'react';
import { TopNav } from '@/components/navigation/TopNav';
import { Sidebar } from '@/components/navigation/Sidebar';
import { MobileNav } from '@/components/navigation/MobileNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="app-layout">
      <TopNav />

      <div className="app-container">
        {!isMobile && <Sidebar collapsed={sidebarCollapsed} />}

        <main className="main-content">
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
}