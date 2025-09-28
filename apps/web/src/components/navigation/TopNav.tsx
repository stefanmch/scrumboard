"use client";

import { Search, Bell, ChevronDown, Menu } from 'lucide-react';
import { useState } from 'react';

export function TopNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="top-nav">
      <div className="top-nav-container">
        {/* Left Section - Logo and Mobile Menu */}
        <div className="top-nav-left">
          <button
            className="mobile-menu-btn md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <a href="/" className="logo">
            <span className="logo-icon">🏠</span>
            <span className="logo-text">ScrumBoard</span>
          </a>
        </div>

        {/* Center Section - Search (hidden on mobile) */}
        <div className="top-nav-center hidden md:flex">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search stories, tasks, people..."
              className="search-input"
            />
          </div>
        </div>

        {/* Right Section - Sprint selector, Notifications, User */}
        <div className="top-nav-right">
          {/* Sprint Selector (hidden on mobile) */}
          <div className="sprint-selector hidden lg:flex">
            <span className="sprint-label">Sprint 23</span>
            <ChevronDown className="w-4 h-4" />
          </div>

          {/* Notifications */}
          <button className="notification-btn" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <span className="notification-badge">3</span>
          </button>

          {/* User Menu */}
          <button className="user-menu-btn" aria-label="User menu">
            <div className="user-avatar">
              <span>👤</span>
            </div>
            <span className="user-name hidden md:inline">User</span>
            <ChevronDown className="w-4 h-4 hidden md:inline" />
          </button>
        </div>
      </div>
    </header>
  );
}