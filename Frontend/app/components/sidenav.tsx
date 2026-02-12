"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CubeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  RectangleStackIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const menuItems = [
  { name: "Home", href: "/", icon: HomeIcon },
  { name: "Orders", href: "/orders", icon: DocumentTextIcon },
  { name: "Production", href: "/production", icon: RectangleStackIcon },
  { name: "Reschedule", href: "/reschedule", icon: ArrowPathIcon },
  { name: "Gantt Chart", href: "/gantt", icon: ChartBarIcon },
  { name: "Products", href: "/products", icon: CubeIcon },
  { name: "Operations", href: "/operations", icon: WrenchScrewdriverIcon },
  { name: "Work Centers", href: "/workcenter", icon: CogIcon },
  { name: "Company Calendar", href: "/company-calendar", icon: CalendarIcon },
  { name: "Shifts", href: "/shifts", icon: ClockIcon },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-16 shrink-0 bg-gray-800 flex flex-col items-center py-4 gap-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${isActive
              ? "bg-red-600 text-white"
              : "text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            title={item.name}
          >
            <Icon className="w-6 h-6" />
          </Link>
        );
      })}
    </aside>
  );
}
