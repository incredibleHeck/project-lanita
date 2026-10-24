'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  User,
  Plus,
  Loader2,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { RoleGuard } from '@/components/role-guard';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

interface TeacherAllocation {
  id: string;
  section: {
    id: string;
    name: string;
    class: {
      name: string;
      code: string;
    };
  };
  subject: {
    id: string;
    name: string;
  };
}

interface StudentItem {
  id: string;
  user: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
  };
  guardians: Array<{
    parent: {
      id: string;
      user: {
        id: string;
        profile: {
          firstName: string;
          lastName: string;
        } | null;
      };
    };
  }>;
}

interface ParentChild {
  id: string;
  user: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
  };
  currentSection: {
    name: string;
    class: {
      name: string;
    };
  };
}

interface TeacherUser {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
  } | null;
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
    <RoleGuard allowedRoles={['TEACHER', 'PARENT', 'ADMIN', 'SUPER_ADMIN']}>
      <MessagesContent />
    </RoleGuard>
  );
}

function MessagesContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // New Chat Dialog States
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [initialMessage, setInitialMessage] = useState<string>('');

  // Queries
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

  // Queries for New Conversation creation
  const isTeacher = user?.role === 'TEACHER';
  const isParent = user?.role === 'PARENT';

  // Teacher-specific data
  const { data: teacherAllocations } = useQuery({
    queryKey: ['allocations', 'teacher', user?.id],
    queryFn: async () => {
      const res = await api.get<TeacherAllocation[]>(`/allocations/teacher/${user?.id}`);
      return res.data;
    },
    enabled: isTeacher && newChatOpen,
  });

  const activeAllocation = teacherAllocations?.find((a) => a.id === selectedAllocationId);
  const activeSectionId = activeAllocation?.section.id;

  const { data: sectionStudents } = useQuery({
    queryKey: ['students', 'section', activeSectionId],
    queryFn: async () => {
      const res = await api.get<StudentItem[]>(`/students/section/${activeSectionId}`);
      return res.data;
    },
    enabled: isTeacher && !!activeSectionId && newChatOpen,
  });

  // Parent-specific data
  const { data: parentChildrenRes } = useQuery({
    queryKey: ['portal', 'parent', 'children', user?.id],
    queryFn: async () => {
      const res = await api.get<{ data: ParentChild[] }>('/portal/parent/children');
      return res.data;
    },
    enabled: isParent && newChatOpen,
  });

  const { data: teachersRes } = useQuery({
    queryKey: ['teachers', 'directory'],
    queryFn: async () => {
      const res = await api.get<{ data: TeacherUser[] }>('/teachers?limit=100');
      return res.data;
    },
    enabled: isParent && newChatOpen,
  });

  // Send message mutation
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

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const payload: {
        parentId?: string;
        teacherId?: string;
        studentId: string;
      } = {
        studentId: selectedStudentId,
      };

      if (isTeacher) {
        payload.parentId = selectedParentId;
      } else if (isParent) {
        payload.teacherId = selectedTeacherId;
      }

      const res = await api.post<MessageThread>('/messaging/threads', payload);
      const thread = res.data;

      // If initial message typed, post it
      if (initialMessage.trim()) {
        await api.post(`/messaging/threads/${thread.id}/messages`, {
          content: initialMessage.trim(),
        });
      }

      return thread;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ['messaging'] });
      toast.success('Conversation started!');
      setSelectedThreadId(thread.id);
      setNewChatOpen(false);
      resetNewChatForm();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to start conversation');
    },
  });

  function resetNewChatForm() {
    setSelectedAllocationId('');
    setSelectedStudentId('');
    setSelectedParentId('');
    setSelectedTeacherId('');
    setInitialMessage('');
  }

  const handleSend = () => {
    if (!newMessage.trim() || !selectedThreadId) return;
    sendMutation.mutate();
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    const student = sectionStudents?.find((s) => s.id === studentId);
    const parentUser = student?.guardians?.[0]?.parent?.user;
    if (parentUser) {
      setSelectedParentId(parentUser.id);
    } else {
      setSelectedParentId('');
    }
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-sm text-muted-foreground">
              Direct and transparent teacher-parent communication
            </p>
          </div>
        </div>
        <Button onClick={() => setNewChatOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      <div className="flex flex-1 gap-4 min-h-0 border rounded-lg overflow-hidden bg-background">
        {/* Left: Threads list */}
        <div className="w-80 border-r border-border/50 bg-muted/20 flex flex-col shrink-0">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">Conversations</h3>
            <span className="text-xs text-muted-foreground">
              {threads?.length || 0} active
            </span>
          </div>
          <ScrollArea className="flex-1">
            {!threads || threads.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Users className="h-8 w-8 opacity-40" />
                <p>No conversations yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewChatOpen(true)}
                  className="mt-2 text-xs"
                >
                  Start one now
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-colors border',
                      selectedThreadId === thread.id
                        ? 'bg-primary/10 border-primary/30'
                        : 'border-transparent hover:bg-muted/60'
                    )}
                  >
                    <div className="font-semibold text-sm truncate">
                      {getOtherParticipantName(thread, user?.id || '')}
                    </div>
                    <div className="text-xs text-primary font-medium truncate mt-0.5">
                      Re: {getStudentName(thread)}
                    </div>
                    {thread.messages && thread.messages.length > 0 && (
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {thread.messages[0].content}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Messages Detail */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedThreadId ? (
            <>
              <div className="p-4 border-b flex items-center justify-between bg-muted/10">
                {threadDetail && (
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <span className="font-semibold text-sm">
                        {getOtherParticipantName(threadDetail, user?.id || '')}
                      </span>
                      <span className="text-muted-foreground text-xs ml-2">
                        (Student: {getStudentName(threadDetail)})
                      </span>
                    </div>
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
                              'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-xs',
                              msg.senderId === user?.id
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted text-foreground rounded-bl-sm'
                            )}
                          >
                            <div className="text-sm break-words">{msg.content}</div>
                            <div className="text-[10px] opacity-70 mt-1 text-right">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t flex gap-2 bg-background">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
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
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
              <div className="text-center max-w-sm">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40 text-primary" />
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  Your Messages
                </h3>
                <p className="text-sm">
                  Select an existing conversation from the list, or start a new conversation.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setNewChatOpen(true)}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start New Conversation Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>
              {isTeacher
                ? 'Select a class, student, and parent to reach out to.'
                : 'Select your child and a teacher to message.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* TEACHER FLOW */}
            {isTeacher && (
              <>
                <div className="space-y-2">
                  <Label>1. Select Class & Subject</Label>
                  <Select
                    value={selectedAllocationId}
                    onValueChange={(val) => {
                      setSelectedAllocationId(val);
                      setSelectedStudentId('');
                      setSelectedParentId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an assigned class" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherAllocations?.map((alloc) => (
                        <SelectItem key={alloc.id} value={alloc.id}>
                          {alloc.section.class.name} - {alloc.section.name} ({alloc.subject.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeSectionId && (
                  <div className="space-y-2">
                    <Label>2. Select Student</Label>
                    <Select
                      value={selectedStudentId}
                      onValueChange={handleStudentSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionStudents?.map((student) => {
                          const name = student.user.profile
                            ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
                            : 'Unknown Student';
                          const guardian = student.guardians?.[0]?.parent?.user?.profile;
                          const guardianName = guardian
                            ? `(Parent: ${guardian.firstName} ${guardian.lastName})`
                            : '(No parent linked)';

                          return (
                            <SelectItem key={student.id} value={student.id}>
                              {name} {guardianName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedStudentId && !selectedParentId && (
                      <p className="text-xs text-amber-600 font-medium">
                        Notice: This student does not have a registered parent user account linked yet.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* PARENT FLOW */}
            {isParent && (
              <>
                <div className="space-y-2">
                  <Label>1. Select Your Child</Label>
                  <Select
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose child" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentChildrenRes?.data?.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.user.profile
                            ? `${child.user.profile.firstName} ${child.user.profile.lastName}`
                            : 'Student'}{' '}
                          ({child.currentSection?.class?.name} - {child.currentSection?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>2. Select Teacher</Label>
                  <Select
                    value={selectedTeacherId}
                    onValueChange={setSelectedTeacherId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachersRes?.data?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.profile
                            ? `${t.profile.firstName} ${t.profile.lastName}`
                            : 'Teacher'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Message Body */}
            <div className="space-y-2">
              <Label>Initial Message</Label>
              <Textarea
                placeholder="Type your message here..."
                rows={3}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewChatOpen(false);
                resetNewChatForm();
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                createThreadMutation.isPending ||
                !selectedStudentId ||
                (isTeacher && !selectedParentId) ||
                (isParent && !selectedTeacherId)
              }
              onClick={() => createThreadMutation.mutate()}
            >
              {createThreadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Conversation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
