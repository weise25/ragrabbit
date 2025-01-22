import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design/shadcn/card";
import { Button } from "@repo/design/shadcn/button";
import Link from "next/link";
import { ArrowRight, Database, Bot, Code2, MessageSquare, Settings, Code, BookOpen } from "@repo/design/base/icons";
import { LucideIcon } from "@repo/design/base/icons";
import { Metadata } from "next";
import { authOrLogin } from "@repo/auth";

export const metadata: Metadata = {
  title: "RagRabbit",
  description: "Your all-in-one solution for building powerful RAG applications.",
};

const sections = [
  {
    title: "Chat",
    description: "Chat with your indexed data using AI",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Indexing",
    description: "Index and manage your data sources for efficient retrieval",
    href: "/dashboard/indexing",
    icon: Database,
  },
  {
    title: "Widget Builder",
    description: "Set up custom chat widgets for your website",
    href: "/dashboard/widget",
    icon: Code2,
  },
  {
    title: "LLM.txt",
    description: "Configure and customize your LLM.txt generation",
    href: "/dashboard/llm",
    icon: Bot,
  },
  {
    title: "Documentation",
    description: "View the documentation on GitHub",
    href: "https://github.com/madarco/ragrabbit",
    icon: BookOpen,
  },
  {
    title: "Demo",
    description: "See the widget in action",
    href: "/widget/demo",
    icon: Code,
    secondary: true,
  },
];

export default async function Home() {
  return (
    <div className="container mx-auto py-12 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to RagRabbit</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          The all-in-one solution for building powerful RAG applications and AI Site Search. <br />
          Index your data, embed a chat widget in your website, and generate a LLM.txt file automatically.
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.href} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={section.href}>
                  <Button className="w-full" variant={section.secondary ? "secondary" : "default"}>
                    Go to {section.title}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
