"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  GraduationCap,
  ClipboardCheck,
  FileText,
  BookOpen,
  Award,
  CalendarCheck,
  ShieldAlert,
  Wallet,
  Calendar,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const adminNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Students",
    href: "/students",
    icon: Users,
  },
  {
    name: "Teachers",
    href: "/dashboard/teachers",
    icon: UserCheck,
  },
  {
    name: "Classes",
    href: "/dashboard/classes",
    icon: GraduationCap,
  },
  {
    name: "Subjects",
    href: "/dashboard/subjects",
    icon: BookOpen,
  },
  {
    name: "Attendance",
    href: "/dashboard/attendance",
    icon: ClipboardCheck,
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
  },
  {
    name: "Billing",
    href: "/admin/billing",
    icon: Wallet,
  },
  {
    name: "Timetable",
    href: "/admin/timetable",
    icon: Calendar,
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: ShieldAlert,
  },
  {
    name: "Announcements",
    href: "/announcements",
    icon: Megaphone,
  },
];

const teacherNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Classes",
    href: "/teacher/classes",
    icon: BookOpen,
  },
  {
    name: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
  {
    name: "Announcements",
    href: "/announcements",
    icon: Megaphone,
  },
];

const studentNavigation = [
  {
    name: "My Dashboard",
    href: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Courses",
    href: "/student/courses",
    icon: BookOpen,
  },
  {
    name: "My Grades",
    href: "/student/grades",
    icon: Award,
  },
  {
    name: "Attendance",
    href: "/student/attendance",
    icon: CalendarCheck,
  },
  {
    name: "My Fees",
    href: "/student/billing",
    icon: Wallet,
  },
  {
    name: "Announcements",
    href: "/announcements",
    icon: Megaphone,
  },
];

const parentNavigation = [
  {
    name: "My Children",
    href: "/parent/dashboard",
    icon: Users,
  },
  {
    name: "Fees & Payments",
    href: "/parent/billing",
    icon: Wallet,
  },
  {
    name: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
  {
    name: "Announcements",
    href: "/announcements",
    icon: Megaphone,
  },
];

const getNavigation = (role: string | undefined) => {
  switch (role) {
    case "TEACHER":
      return teacherNavigation;
    case "STUDENT":
      return studentNavigation;
    case "PARENT":
      return parentNavigation;
    default:
      return adminNavigation;
  }
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigation = getNavigation(user?.role);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-lg font-bold text-primary-foreground">H</span>
        </div>
        <span className="text-lg font-semibold">HeckTeck SMS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t">
        <p className="text-xs text-muted-foreground">
          © 2025 HeckTeck SMS
        </p>
      </div>
    </div>
  );
}

export { adminNavigation as navigation, getNavigation };
