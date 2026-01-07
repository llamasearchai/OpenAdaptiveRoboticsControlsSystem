'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  LayoutDashboard,
  Cpu,
  GraduationCap,
  LineChart,
  Database,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Play,
  Layers,
  Target,
  Boxes,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Tooltip, TooltipContent, TooltipTrigger, ScrollArea } from '@/components/ui';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Robots',
    href: '/robots',
    icon: Bot,
    children: [
      { title: 'All Robots', href: '/robots', icon: Boxes },
      { title: 'Configuration', href: '/robots/configure', icon: Settings },
      { title: 'Trajectories', href: '/robots/trajectories', icon: Layers },
    ],
  },
  {
    title: 'Simulator',
    href: '/simulator',
    icon: Play,
  },
  {
    title: 'Training',
    href: '/training',
    icon: GraduationCap,
    badge: '2',
    children: [
      { title: 'Experiments', href: '/training', icon: Target },
      { title: 'New Run', href: '/training/new', icon: Play },
    ],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: LineChart,
  },
  {
    title: 'Datasets',
    href: '/datasets',
    icon: Database,
  },
  {
    title: 'Safety',
    href: '/safety',
    icon: Shield,
  },
  {
    title: 'Kinematics',
    href: '/kinematics',
    icon: Cpu,
  },
];

const bottomNavItems: NavItem[] = [
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

export function Sidebar({
  collapsed = false,
  onCollapsedChange,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const NavLink = ({
    item,
    isChild = false,
  }: {
    item: NavItem;
    isChild?: boolean;
  }) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);

    const content = (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          isChild && 'ml-6',
          collapsed && !isChild && 'justify-center px-2'
        )}
      >
        <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded && 'rotate-90'
                )}
              />
            )}
          </>
        )}
      </div>
    );

    if (collapsed && !isChild) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link href={item.href}>{content}</Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            {item.badge && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    if (hasChildren) {
      return (
        <div>
          <button
            type="button"
            className="w-full"
            onClick={() => toggleExpanded(item.title)}
          >
            {content}
          </button>
          {isExpanded && !collapsed && (
            <div className="mt-1 space-y-1">
              {item.children!.map((child) => (
                <NavLink key={child.href} item={child} isChild />
              ))}
            </div>
          )}
        </div>
      );
    }

    return <Link href={item.href}>{content}</Link>;
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 items-center border-b px-4',
          collapsed ? 'justify-center' : 'gap-2'
        )}
      >
        <Bot className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-lg">ARCS</span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t p-2">
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Collapse button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'mt-2 w-full',
            collapsed ? 'justify-center px-2' : 'justify-start'
          )}
          onClick={() => onCollapsedChange?.(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
