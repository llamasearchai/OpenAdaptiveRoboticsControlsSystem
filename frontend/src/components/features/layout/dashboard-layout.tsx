'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { TooltipProvider } from '@/components/ui';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - desktop */}
        <div className="hidden md:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </div>

        {/* Sidebar - mobile */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar
            collapsed={false}
            onCollapsedChange={() => setMobileMenuOpen(false)}
          />
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            showMenuButton
            onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
          <main
            className={cn(
              'flex-1 overflow-auto p-4 md:p-6',
              className
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
