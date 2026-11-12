import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Share2, MessageSquare, Shield, LogOut, ClipboardList } from 'lucide-react';
import {
  addReportComment,
  getHistory,
  listReportAuditLog,
  listReportComments,
  listSharedReports,
  loginCollabUser,
  registerCollabUser,
  shareVerificationReport,
} from '../services/api';
import type {
  AuditLogItem,
  CollabUserSession,
  ReportCommentItem,
  SharedReportItem,
  VerificationJob,
} from '../types';

const SESSION_KEY = 'verityai_collab_session';

export const CollaborationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<CollabUserSession | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'admin' | 'reviewer' | 'member'>('reviewer');

  const [jobs, setJobs] = useState<VerificationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('job_id') || '');
  const [sharedReports, setSharedReports] = useState<SharedReportItem[]>([]);
  const [comments, setComments] = useState<ReportCommentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'admin' | 'reviewer' | 'member'>('reviewer');
  const [assignedReviewer, setAssignedReviewer] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'review_note' | 'assignment'>('comment');
  const [commentText, setCommentText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHistory(1, 30)
      .then((res) => {
        const list = res.items || res || [];
        setJobs(list);
        if (!selectedJobId && list.length > 0) setSelectedJobId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const refreshCollabData = async (activeSession: CollabUserSession, jobId: string) => {
    try {
      const shares = await listSharedReports(activeSession.access_token);
      setSharedReports(shares);
    } catch {
      setSharedReports([]);
    }
    if (!jobId) return;
    try {
      const [c, a] = await Promise.all([
        listReportComments(jobId, activeSession.access_token),
        listReportAuditLog(jobId, activeSession.access_token),
      ]);
      setComments(c);
      setAuditLogs(a);
    } catch (err: any) {
      setComments([]);
      setAuditLogs([]);
      if (err?.response?.status === 403) {
        setError(err?.response?.data?.detail || 'Access denied for this report.');
      }
    }
  };

  useEffect(() => {
    if (session && selectedJobId) {
      refreshCollabData(session, selectedJobId);
    }
  }, [session, selectedJobId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    try {
      const data =
        authMode === 'register'
          ? await registerCollabUser({ email, password, display_name: displayName || undefined, role })
          : await loginCollabUser({ email, password });
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setSession(data);
      setStatusMessage(`Signed in as ${data.email} (${data.role})`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Authentication failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setSharedReports([]);
    setComments([]);
    setAuditLogs([]);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedJobId || !shareEmail) return;
    setError(null);
    setStatusMessage(null);
    try {
      await shareVerificationReport(selectedJobId, session.access_token, {
        member_email: shareEmail,
        member_role: shareRole,
        assigned_reviewer_email: assignedReviewer || undefined,
      });
      setShareEmail('');
      setAssignedReviewer('');
      setStatusMessage('Report shared and logged to audit trail.');
      await refreshCollabData(session, selectedJobId);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to share report.');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedJobId || !commentText.trim()) return;
    setError(null);
    setStatusMessage(null);
    try {
      await addReportComment(selectedJobId, session.access_token, {
        comment_type: commentType,
        content: commentText,
      });
      setCommentText('');
      setStatusMessage('Comment added.');
      await refreshCollabData(session, selectedJobId);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add comment.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Team Collaboration & Review Governance
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Role-based shared verification reports, reviewer assignments, review notes, and immutable audit logs.
          </p>
        </div>

        {session && (
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              {session.email} ({session.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm">{error}</div>
      )}
      {statusMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-4 text-sm">
          {statusMessage}
        </div>
      )}

      {!session ? (
        <form onSubmit={handleAuth} className="max-w-md bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                authMode === 'login' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                authMode === 'register' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Register Team User
            </button>
          </div>

          <input
            type="email"
            required
            placeholder="Team Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="password"
            required
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          {authMode === 'register' && (
            <>
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'reviewer' | 'member')}
                className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="admin">Admin</option>
                <option value="reviewer">Reviewer</option>
                <option value="member">Member</option>
              </select>
            </>
          )}
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
          >
            {authMode === 'register' ? 'Create Account & Sign In' : 'Sign In'}
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Verification Report
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="">Select job...</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.original_text.slice(0, 42)}...
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleShare} className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-400" /> Share & Assign Reviewer
              </h3>
              <input
                type="email"
                required
                placeholder="Member email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as 'admin' | 'reviewer' | 'member')}
                className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="member">Member</option>
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
              </select>
              <input
                type="email"
                placeholder="Assigned reviewer email (optional)"
                value={assignedReviewer}
                onChange={(e) => setAssignedReviewer(e.target.value)}
                className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
              >
                Share Report
              </button>
            </form>

            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-2">
              <h3 className="text-sm font-semibold text-white">Shared With You ({sharedReports.length})</h3>
              {sharedReports.length === 0 ? (
                <p className="text-xs text-slate-400">No shared reports yet.</p>
              ) : (
                sharedReports.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedJobId(s.verification_job_id)}
                    className="w-full text-left p-2.5 rounded-lg bg-[#0a0e1a] border border-slate-800 hover:border-cyan-500/40 text-xs space-y-1"
                  >
                    <div className="text-cyan-300 font-mono truncate">{s.verification_job_id}</div>
                    <div className="text-slate-400">
                      Role: {s.member_role} • Owner: {s.owner_email}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleComment} className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" /> Comments & Review Notes
              </h3>
              <div className="flex gap-2">
                <select
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value as 'comment' | 'review_note' | 'assignment')}
                  className="bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="comment">Comment</option>
                  <option value="review_note">Review Note (Reviewer/Admin)</option>
                  <option value="assignment">Assignment Note</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Add review note or discussion comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-[#0a0e1a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
                >
                  Post
                </button>
              </div>
              <div className="space-y-2 pt-2">
                {comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-[#0a0e1a] border border-slate-800 text-sm">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>
                        <strong className="text-slate-200">{c.author_email}</strong> ({c.author_role}) •{' '}
                        <span className="text-cyan-400">{c.comment_type}</span>
                      </span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-200">{c.content}</p>
                  </div>
                ))}
              </div>
            </form>

            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-cyan-400" /> Audit Activity Log
              </h3>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400">No audit entries recorded for this report yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-lg bg-[#0a0e1a] border border-slate-800 text-xs flex justify-between gap-4">
                      <div>
                        <span className="text-cyan-300 font-medium">{log.action}</span> by{' '}
                        <span className="text-slate-200">{log.actor_email}</span> ({log.actor_role})
                      </div>
                      <span className="text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

