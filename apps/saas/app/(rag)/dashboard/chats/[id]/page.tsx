import React, { useMemo } from "react";
import { authOrLogin } from "@repo/auth";
import db from "@repo/db";
import { and, eq, not, count, sql } from "@repo/db/drizzle";
import { chatsTable, messagesTable } from "@repo/db/schema";
import {
  ArrowLeft,
  Calendar,
  Hash,
  MessageSquare,
  User,
  Type,
  ChevronDown,
  Bot,
  Terminal,
} from "@repo/design/base/icons";
import { Button } from "@repo/design/shadcn/button";
import { Card, CardContent } from "@repo/design/shadcn/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/design/shadcn/collapsible";
import { SourceBoxList } from "@repo/design/components/chat/source-box";
import Link from "next/link";
import { notFound } from "next/navigation";

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatTimeDelta(startDate: Date, currentDate: Date): string {
  const deltaMs = currentDate.getTime() - startDate.getTime();
  const deltaSeconds = Math.floor(deltaMs / 1000);

  if (deltaSeconds < 60) {
    return `+${deltaSeconds}s`;
  }

  const deltaMinutes = Math.floor(deltaSeconds / 60);
  const remainingSeconds = deltaSeconds % 60;
  return `+${deltaMinutes}m ${remainingSeconds}s`;
}

export default async function ChatDetailPage({ params }: { params: { id: string } }) {
  const session = await authOrLogin();
  const { id } = await params;

  // Fetch chat with message count and total tokens
  const chatStats = await db
    .select({
      chat: chatsTable,
      messageCount: count(sql<number>`CASE WHEN ${messagesTable.role} != 'system' THEN 1 END`),
      totalTokens: sql<number>`sum(${messagesTable.tokenCount})`,
    })
    .from(chatsTable)
    .where(and(eq(chatsTable.id, id), eq(chatsTable.organizationId, session.user.organizationId)))
    .leftJoin(messagesTable, eq(chatsTable.id, messagesTable.chatId))
    .groupBy(chatsTable.id)
    .limit(1);

  const chat = chatStats[0]?.chat;

  if (!chat) {
    notFound();
  }

  // Fetch messages separately
  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, id))
    .orderBy(messagesTable.createdAt);

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild className="h-8 w-8">
              <Link href="/dashboard/chats">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">
              {chat.title ? capitalize(chat.title) : "Untitled chat"}
            </h2>
          </div>
          <p className="text-muted-foreground">View chat details and messages</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created
                </div>
                <div className="font-medium">{chat.createdAt?.toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User
                </div>
                <div className="font-medium">{chat.userId}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </div>
                <div className="font-medium">{chatStats[0]?.messageCount}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Total Tokens
                </div>
                <div className="font-medium">{chatStats[0]?.totalTokens || 0}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  IP Address
                </div>
                <div className="font-medium">{chat.ip || "Unknown"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Messages</h3>
                <p className="text-sm text-muted-foreground">{messages.length} total messages</p>
              </div>
            </div>

            <div className="space-y-4">
              {messages.map((message, i) => {
                const messageDate = message.createdAt;
                const firstMessageDate = messages[0]?.createdAt;
                const timeDisplay =
                  i === 0
                    ? messageDate?.toLocaleString()
                    : messageDate && firstMessageDate
                      ? formatTimeDelta(firstMessageDate, messageDate)
                      : "";

                return (
                  <div key={i} className="border rounded-lg">
                    <div className="border-b bg-muted/50 px-4 py-2 flex items-center justify-between">
                      <div className="font-medium capitalize flex items-center gap-2">
                        {message.role === "user" && <User className="h-4 w-4" />}
                        {message.role === "system" && <Terminal className="h-4 w-4" />}
                        {message.role === "assistant" && <Bot className="h-4 w-4" />}
                        {message.role}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          {message.tokenCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">{timeDisplay}</div>
                      </div>
                    </div>
                    {message.role === "system" ? (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full flex items-center gap-2 justify-start p-2 h-8">
                            <ChevronDown className="h-4 w-4" />
                            <span className="text-sm font-medium">Show system message</span>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-4 pt-0">
                            <pre className="whitespace-pre-wrap text-sm max-h-[200px] overflow-y-auto">
                              {message.content}
                            </pre>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <div className="p-4">
                        <pre className="whitespace-pre-wrap text-sm max-h-[200px] overflow-y-auto">
                          {message.content}
                        </pre>
                        {message.reasoning && (
                          <>
                            <div className="mt-4 pt-4 border-t">
                              <div className="text-sm font-medium mb-2">Reasoning:</div>
                              <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                                {message.reasoning}
                              </pre>
                            </div>
                          </>
                        )}
                        {message.annotations && Object.keys(message.annotations).length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 p-0 h-6">
                                  <ChevronDown className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Annotations ({Object.keys(message.annotations).length})
                                  </span>
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2">
                                <div className="space-y-2">
                                  {Object.entries(message.annotations).map(([name, annotation], index) => {
                                    if (name === "sources") {
                                      return (
                                        <div key={index}>
                                          <div className="font-medium mb-2">Sources</div>
                                          <SourceBoxList sources={annotation.data} />
                                        </div>
                                      );
                                    }
                                    if (name === "suggestedPrompts") {
                                      return (
                                        <div key={index}>
                                          <div className="font-medium mb-2">Suggested Prompts </div>
                                          <div className="flex flex-wrap gap-2">
                                            {annotation.data.map((query: string, i: number) => (
                                              <Button key={i} variant="outline" className="py-1 md:py-2">
                                                {query}
                                              </Button>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div
                                        key={index}
                                        className="text-sm text-muted-foreground bg-muted/50 p-2 rounded"
                                      >
                                        <div className="font-medium mb-1">{name}</div>
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(annotation, null, 2)}</pre>
                                      </div>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No messages available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
