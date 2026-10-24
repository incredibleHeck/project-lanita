"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Clipboard, FileText, MoreVertical, Play, Send } from "lucide-react";
import { format } from "date-fns";

export interface StreamAttachment {
  url: string;
  name?: string;
}

export interface StreamAnnouncement {
  id: string;
  content: string;
  attachments: StreamAttachment[] | null;
  createdAt: string;
  author: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
  _count?: { comments: number };
  isSystemPost?: boolean;
  linkedEntityId?: string | null;
  linkedEntityType?: string | null; // 'ASSIGNMENT' | 'MATERIAL'
}

export interface StreamComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
}

function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "youtube.com" || u.hostname === "www.youtube.com" || u.hostname === "youtu.be";
  } catch {
    return false;
  }
}

function getFileType(url: string, name?: string): string {
  const path = name ?? url;
  if (path.toLowerCase().endsWith(".pdf")) return "PDF";
  if (path.toLowerCase().match(/\.(doc|docx)$/)) return "Doc";
  if (path.toLowerCase().match(/\.(xls|xlsx)$/)) return "Sheet";
  if (isYouTubeUrl(url)) return "Video";
  return "Link";
}

function getAuthorName(profile: { firstName: string; lastName: string } | null): string {
  if (!profile) return "Unknown";
  return `${profile.firstName} ${profile.lastName}`.trim() || "Unknown";
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

interface StreamPostCardProps {
  post: StreamAnnouncement;
  courseId: string;
  /** When set, the whole card is a link (e.g. for system posts to assignment/material). */
  linkHref?: string | null;
}

export function StreamPostCard({ post, courseId, linkHref }: StreamPostCardProps) {
  const queryClient = useQueryClient();
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");

  const authorName = getAuthorName(post.author?.profile ?? null);
  const initials = getInitials(authorName);
  const attachments = Array.isArray(post.attachments) ? post.attachments : [];
  const commentCount = post._count?.comments ?? 0;

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["announcements", post.id, "comments"],
    queryFn: async () => {
      const { data } = await api.get<StreamComment[]>(`/announcements/${post.id}/comments`);
      return data;
    },
    enabled: commentsExpanded,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post<StreamComment>(`/announcements/${post.id}/comments`, { content });
      return data;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["announcements", post.id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["lms", "stream", courseId] });
      toast.success("Comment added");
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Failed to add comment");
    },
  });

  const handleSendComment = () => {
    const text = newComment.trim();
    if (!text || createCommentMutation.isPending) return;
    createCommentMutation.mutate(text);
  };

  const isSystemPost = post.isSystemPost === true;
  const isClickable = isSystemPost && linkHref;

  const cardContent = (
    <Card className={`p-5 shadow-sm rounded-lg mb-4 border border-border/60 ${isClickable ? "transition-colors hover:bg-muted/50 cursor-pointer" : ""}`}>
      {/* Header: Avatar, Name, date, MoreVertical */}
      <div className="flex items-center gap-3" onClick={(e) => isClickable && e.stopPropagation()}>
        <Avatar className="h-10 w-10 shrink-0 rounded-full">
          {post.author?.profile?.avatarUrl ? (
            <AvatarImage src={post.author.profile.avatarUrl} alt={authorName} />
          ) : null}
          <AvatarFallback className="text-sm bg-muted text-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{authorName}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(post.createdAt), "MMM d, h:mm a")}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" aria-label="Options">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="mt-4 text-sm flex items-start gap-2">
        {isSystemPost && (
          <Clipboard className="h-4 w-4 shrink-0 text-green-600 mt-0.5" aria-hidden />
        )}
        <p className="text-foreground whitespace-pre-wrap break-words flex-1 min-w-0">
          {post.content}
        </p>
      </div>

      {/* Attachments: flex grid of small cards */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {attachments.map((att, idx) => {
            const isYt = isYouTubeUrl(att.url);
            const fileType = getFileType(att.url, att.name);
            const label = att.name || (isYt ? "YouTube" : att.url.split("/").pop() ?? "Attachment");
            return (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border rounded-md p-3 flex items-center gap-3 w-64 hover:bg-slate-50 transition-colors min-w-0"
              >
                {isYt ? (
                  <Play className="h-5 w-5 shrink-0 text-red-600" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{label}</p>
                  <p className="text-xs text-muted-foreground">{fileType}</p>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Separator + Class comments section */}
      <div className="mt-4 pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setCommentsExpanded((e) => !e)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {commentCount === 0 && !commentsExpanded
            ? "Add comment"
            : `${commentCount} comment${commentCount !== 1 ? "s" : ""}`}
        </button>

        {commentsExpanded && (
          <div className="mt-3 space-y-3">
            {commentsLoading ? (
              <p className="text-xs text-muted-foreground">Loading comments…</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => {
                  const cName = getAuthorName(c.author?.profile ?? null);
                  const cInitials = getInitials(cName);
                  return (
                    <li key={c.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        {c.author?.profile?.avatarUrl ? (
                          <AvatarImage src={c.author.profile.avatarUrl} alt={cName} />
                        ) : null}
                        <AvatarFallback className="text-xs bg-muted text-foreground">
                          {cInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{cName}</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">
                          {c.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(c.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Comment input: pill with Avatar + borderless input + send */}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-muted text-foreground">U</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center gap-2 rounded-full bg-slate-50 border-0 px-3 py-2 min-w-0">
                <input
                  type="text"
                  placeholder="Add class comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  disabled={!newComment.trim() || createCommentMutation.isPending}
                  onClick={handleSendComment}
                  className="shrink-0 p-1 rounded-full hover:bg-slate-200/80 transition-colors disabled:opacity-50"
                  aria-label="Send comment"
                >
                  <Send className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  if (isClickable) {
    return <Link href={linkHref!}>{cardContent}</Link>;
  }
  return cardContent;
}
