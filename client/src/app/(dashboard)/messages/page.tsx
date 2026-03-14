'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  User,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { RoleGuard } from '@/components/role-guard';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MessageThread {
  id: string;
  participantA: string;
  participantB: string;
  studentId: string;
  lastMessageAt: string;
  userA: { profile: { firstName: string; lastName: string } | null };
  userB: { profile: { firstName: string; lastName: string } | null };
  student: { user: { profile: { firstName: string; lastName: string } | null } };
  messages: Array<{
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    sender: { profile: { firstName: string; lastName: string } | null };
  }>;
}

function getOtherParticipantName(thread: MessageThread, currentUserId: string) {
  const other = thread.participantA === currentUserId ? thread.userB : thread.userA;
  const profile = other?.profile;
  return profile ? `${profile.firstName} ${profile.lastName}` : 'Unknown';
}

function getStudentName(thread: MessageThread) {
  const profile = thread.student?.user?.profile;
  return profile ? `${profile.firstName} ${profile.lastName}` : 'Student';
}

export default function MessagesPage() {
  return (
    <RoleGuard allowedRoles={['TEACHER', 'PARENT']}>
      <MessagesContent />
    </RoleGuard>
  );
}

function MessagesContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const { data: threads, isLoading } = useQuery({
    queryKey: ['messaging', 'threads'],
    queryFn: async () => {
      const res = await api.get<MessageThread[]>('/messaging/threads');
      return res.data;
    },
  });

  const { data: threadDetail, isLoading: threadLoading } = useQuery({
    queryKey: ['messaging', 'thread', selectedThreadId],
    queryFn: async () => {
      const res = await api.get<MessageThread>(`/messaging/threads/${selectedThreadId}`);
      return res.data;
    },
    enabled: !!selectedThreadId,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/messaging/threads/${selectedThreadId}/messages`, {
        content: newMessage,
      });
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['messaging'] });
    },
  });

  const handleSend = () => {
    if (!newMessage.trim() || !selectedThreadId) return;
    sendMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Teacher-parent communication
          </p>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0 border rounded-lg overflow-hidden">
        <div className="w-80 border-r border-border/50 bg-muted/30 flex flex-col shrink-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Conversations</h3>
          </div>
          <ScrollArea className="flex-1">
            {threads?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No conversations yet.
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {threads?.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-colors',
                      selectedThreadId === thread.id
                        ? 'bg-muted'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="font-medium truncate">
                      {getOtherParticipantName(thread, user?.id || '')}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      Re: {getStudentName(thread)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {selectedThreadId ? (
            <>
              <div className="p-4 border-b">
                {threadDetail && (
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <span className="font-medium">
                      {getOtherParticipantName(threadDetail, user?.id || '')}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      (Re: {getStudentName(threadDetail)})
                    </span>
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                {threadLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-3/4" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {threadDetail?.messages
                      ?.slice()
                      .reverse()
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex',
                            msg.senderId === user?.id ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[75%] rounded-2xl px-4 py-2.5',
                              msg.senderId === user?.id
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted text-foreground rounded-bl-sm'
                            )}
                          >
                            <div className="text-sm">{msg.content}</div>
                            <div className="text-xs opacity-70 mt-1">
                              {new Date(msg.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
