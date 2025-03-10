import {
  Users,
  Settings,
  LayoutGrid,
  MessageSquare,
  MessageSquareCode,
  FileText,
  BookOpen,
  Share2,
} from "@repo/design/base/icons";
import type { MenuGroup } from "@repo/design/components/providers/config-provider";

export const sidebarMenu: MenuGroup[] = [
  {
    groupLabel: "",
    menus: [
      {
        href: "/chat",
        label: "Chat",
        icon: MessageSquare,
        submenus: [],
      },
      {
        href: "/dashboard/widget",
        label: "Widget",
        icon: MessageSquareCode,
      },
      {
        href: "/dashboard/llms",
        label: "LLMs.txt",
        icon: FileText,
      },
      {
        href: "/dashboard/mcp",
        label: "MCP Server",
        icon: Share2,
      },
    ],
  },

  {
    groupLabel: "RAG",
    menus: [
      {
        href: "/dashboard/indexing",
        label: "Indexing",
        icon: LayoutGrid,
      },
      {
        href: "/dashboard/chats",
        label: "Chats History",
        icon: MessageSquare,
      },
    ],
  },
  {
    groupLabel: "Settings",
    menus: [
      {
        href: "/dashboard/api",
        label: "API Keys",
        icon: MessageSquareCode,
      },
      {
        href: "/dashboard/user/profile",
        label: "User",
        icon: Users,
      },
      // Uncomment if needed:
      /*{
        href: "/user/account",
        label: "Account",
        icon: Settings,
      },*/
    ],
  },
];

export const headerMenu = [
  {
    href: "/user/profile",
    label: "Profile",
    icon: Users,
  },
  {
    href: "/user/settings",
    label: "Settings",
    icon: Settings,
  },
];
