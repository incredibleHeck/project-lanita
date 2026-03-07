'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Pin, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Announcement {
  id: string;
  title: string;
  content: string;
  scope: string;
  scopeId: string | null;
  isPinned: boolean;
  publishAt: string;
  expiresAt: string | null;
  author: {
    profile: { firstName: string; lastName: string } | null;
  };
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements', scopeFilter],
    queryFn: async () => {
      const params = scopeFilter !== 'ALL' ? `?scope=${scopeFilter}` : '';
      const res = await api.get<Announcement[]>(`/announcements${params}`);
      return res.data;
    },
  });

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Announcements</h1>
            <p className="text-sm text-muted-foreground">
              School-wide and class updates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Announcements</SelectItem>
                <SelectItem value="SCHOOL_WIDE">School-Wide</SelectItem>
                <SelectItem value="CLASS">Class</SelectItem>
                <SelectItem value="SECTION">Section</SelectItem>
              </SelectContent>
            </Select>
          )}

          {(isAdmin || isTeacher) && (
            <CreateAnnouncementDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['announcements'] });
                setCreateOpen(false);
              }}
            />
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : announcements?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No announcements yet.</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-4 pr-4">
            {announcements?.map((ann) => (
              <Card key={ann.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{ann.title}</CardTitle>
                        {ann.isPinned && (
                          <Badge variant="secondary" className="gap-1">
                            <Pin className="h-3 w-3" />
                            Pinned
                          </Badge>
                        )}
                        <Badge variant="outline">{ann.scope.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        By{' '}
                        {ann.author?.profile
                          ? `${ann.author.profile.firstName} ${ann.author.profile.lastName}`
                          : 'Unknown'}{' '}
                        • {new Date(ann.publishAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{ann.content}</p>
                  {ann.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Expires: {new Date(ann.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function CreateAnnouncementDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<string>('SCHOOL_WIDE');
  const [scopeId, setScopeId] = useState<string>('');
  const [isPinned, setIsPinned] = useState(false);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/announcements', {
        title,
        content,
        scope,
        scopeId: scopeId || undefined,
        isPinned,
        notifyWhatsApp,
      });
    },
    onSuccess: () => {
      setTitle('');
      setContent('');
      setScope('SCHOOL_WIDE');
      setScopeId('');
      onSuccess();
    },
  });

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const res = await api.get('/sections');
      return res.data;
    },
    enabled: open && (scope === 'SECTION' || scope === 'CLASS'),
  });

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
            />
          </div>
          <div>
            <Label>Content</Label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement..."
            />
          </div>
          <div>
            <Label>Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHOOL_WIDE">School-Wide</SelectItem>
                <SelectItem value="CLASS">Class</SelectItem>
                <SelectItem value="SECTION">Section</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(scope === 'CLASS' || scope === 'SECTION') && sections?.length > 0 && (
            <div>
              <Label>{scope === 'CLASS' ? 'Class' : 'Section'}</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {scope === 'CLASS' ? (
                    [...new Map(sections.map((s: any) => [s.class?.id, s.class])).values()]
                      .filter(Boolean)
                      .map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                  ) : (
                    sections.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.class?.name} - {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
              />
              <span className="text-sm">Pin to top</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
              />
              <span className="text-sm">Notify via WhatsApp</span>
            </label>
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Megaphone className="h-4 w-4 mr-2" />
            )}
            Publish Announcement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
