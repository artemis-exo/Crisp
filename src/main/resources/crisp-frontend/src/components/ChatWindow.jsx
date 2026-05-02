import React, { useEffect, useRef, useState, useCallback } from "react";
import Avatar from "./Avatar";
import ProfilePage from "./ProfilePage";
import { useAuth } from "../context/AuthContext";
import {
  getRoomName, fmtTime, fmtDate, fmtLastSeen,
  isVideo, isAudio, isImage, canEdit, canDeleteForEveryone, truncate
} from "../utils/helpers";
import { getChatHistory, getUserStatus, uploadMedia, getMediaUrl, searchMessages } from "../services/api";
import { wsService } from "../services/websocket";

const EMOJI_LIST  = ["👍","❤️","😂","😮","😢","🔥","🎉","👀"];
const TYPING_STOP = 2500;

export default function ChatWindow({ room, messages, onNewMessage, wsConnected, onBack, rooms }) {
  const { username } = useAuth();
  const [text,          setText]          = useState("");
  const [loading,       setLoading]       = useState(false);
  const [fetched,       setFetched]       = useState(false);
  const [typingUsers,   setTypingUsers]   = useState([]);
  const [peerStatus,    setPeerStatus]    = useState(null);
  const [uploading,     setUploading]     = useState(false);
  const [uploadProg,    setUploadProg]    = useState(0);

  // Feature states
  const [replyTo,       setReplyTo]       = useState(null);   // message being replied to
  const [editingMsg,    setEditingMsg]    = useState(null);   // message being edited
  const [contextMenu,   setContextMenu]   = useState(null);   // { msg, x, y }
  const [forwardMsg,    setForwardMsg]    = useState(null);   // message to forward
  const [searching,     setSearching]     = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isRecording,   setIsRecording]   = useState(false);
  const [recordTime,    setRecordTime]    = useState(0);
  const [viewProfile,   setViewProfile]   = useState(null);
  const [emojiOpen,     setEmojiOpen]     = useState(null);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const fileRef      = useRef(null);
  const typingTimer  = useRef(null);
  const isTypingRef  = useRef(false);
  const mediaRecRef  = useRef(null);
  const audioChunks  = useRef([]);
  const recordTimer  = useRef(null);

  const isGroup  = room?.isGroup || room?.group;
  const roomName = room ? getRoomName(room, username) : "";

  // ── Load history ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    setFetched(false); setLoading(true); setTypingUsers([]);
    setReplyTo(null); setEditingMsg(null); setContextMenu(null);
    getChatHistory(room.id)
      .then(({ data }) => { onNewMessage(room.id, data, true); setFetched(true); })
      .catch(() => setFetched(true))
      .finally(() => setLoading(false));
  }, [room?.id]);

  // ── Subscribe WS ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    wsService.subscribeRoom(room.id, (msg) => onNewMessage(room.id, [msg], false));
    wsService.subscribeTyping(room.id, (ev) => {
      if (ev.username === username) return;
      setTypingUsers((p) =>
        ev.typing ? (p.includes(ev.username) ? p : [...p, ev.username])
                  : p.filter((u) => u !== ev.username)
      );
      setTimeout(() => setTypingUsers((p) => p.filter((u) => u !== ev.username)), 4000);
    });
  }, [room?.id, wsConnected]);

  // ── Peer status (1-1 chats) ────────────────────────────────────────────────
  useEffect(() => {
    if (!room || isGroup) return;
    const peer = (room.participantIds || []).find((u) => u !== username);
    if (!peer) return;
    getUserStatus(peer).then(({ data }) => setPeerStatus(data)).catch(() => {});
    const iv = setInterval(() => {
      getUserStatus(peer).then(({ data }) => setPeerStatus(data)).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, [room?.id, isGroup]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, typingUsers.length]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  // ── Typing ────────────────────────────────────────────────────────────────
  const handleTextChange = (e) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    if (!wsService.connected || !room) return;
    if (!isTypingRef.current) { isTypingRef.current = true; wsService.sendTyping(room.id, username, true); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false; wsService.sendTyping(room.id, username, false);
    }, TYPING_STOP);
  };

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    if (isTypingRef.current && room) { isTypingRef.current = false; wsService.sendTyping(room.id, username, false); }
  }, [room, username]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback((mediaFileId = null, mediaType = null, mediaName = null) => {
    const content = text.trim();
    if (!content && !mediaFileId) return;
    if (!room || !wsService.connected) return;
    stopTyping();

    if (editingMsg) {
      // Edit mode
      wsService.editMessage(editingMsg.id, room.id, content);
      setEditingMsg(null); setText(""); if (inputRef.current) inputRef.current.style.height = "auto";
      return;
    }

    wsService.sendMessage(
      room.id, content, username, username,
      mediaFileId, mediaType, mediaName,
      replyTo?.id, replyTo?.content, replyTo?.senderName
    );
    setText(""); setReplyTo(null);
    if (inputRef.current) { inputRef.current.style.height = "auto"; inputRef.current.focus(); }
  }, [text, room, username, stopTyping, replyTo, editingMsg]);

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;
    setUploading(true); setUploadProg(0);
    try {
      const { data } = await uploadMedia(file, (ev) => {
        if (ev.total) setUploadProg(Math.round((ev.loaded * 100) / ev.total));
      });
      send(data.fileId, data.mediaType, data.mediaName);
    } catch (_) { alert("Failed to upload file"); }
    finally { setUploading(false); setUploadProg(0); e.target.value = ""; }
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      mediaRecRef.current = new MediaRecorder(stream);
      mediaRecRef.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecRef.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setUploading(true);
        try {
          const { data } = await uploadMedia(file, () => {});
          send(data.fileId, data.mediaType, "Voice Message");
        } catch (_) { alert("Failed to send voice message"); }
        finally { setUploading(false); }
      };
      mediaRecRef.current.start();
      setIsRecording(true);
      setRecordTime(0);
      recordTimer.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch (_) { alert("Microphone access denied"); }
  };

  const stopRecording = () => {
    clearInterval(recordTimer.current);
    setIsRecording(false);
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
  };

  // ── Message search ────────────────────────────────────────────────────────
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim() || !room) { setSearchResults([]); return; }
    try {
      const { data } = await searchMessages(room.id, q);
      setSearchResults(data);
    } catch (_) {}
  };

  // ── Context menu actions ───────────────────────────────────────────────────
  const handleReply   = (msg) => { setReplyTo(msg); setContextMenu(null); inputRef.current?.focus(); };
  const handleEdit    = (msg) => { setEditingMsg(msg); setText(msg.content); setContextMenu(null); inputRef.current?.focus(); };
  const handleDelete  = (msg, forEveryone) => {
    wsService.deleteMessage(msg.id, room.id, forEveryone);
    setContextMenu(null);
  };
  const handleForward = (msg) => { setForwardMsg(msg); setContextMenu(null); };
  const handleCopy    = (msg) => { navigator.clipboard?.writeText(msg.content || ""); setContextMenu(null); };

  if (!room) return <EmptyState />;

  const grouped   = groupByDate(messages || []);
  const isOnline  = !isGroup && peerStatus?.status === "ONLINE";
  const headerSub = isGroup
    ? `${(room.participantIds || []).length} members`
    : peerStatus ? fmtLastSeen(peerStatus.status, peerStatus.lastSeen) : "…";

  const peerUsername = !isGroup
    ? (room.participantIds || []).find((u) => u !== username)
    : null;

  return (
    <div className="flex flex-col h-full bg-crisp-bg">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-crisp-surface border-b border-crisp-border flex-shrink-0"
        style={{ paddingTop: `max(12px, env(safe-area-inset-top))` }}>
        <button onClick={onBack}
          className="lg:hidden w-9 h-9 rounded-xl bg-crisp-card border border-crisp-border flex items-center justify-center active:scale-95">
          <svg className="w-4 h-4 text-crisp-sub" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        {/* Avatar — click to view profile */}
        <button onClick={() => !isGroup && peerUsername && setViewProfile(peerUsername)}
          className="relative flex-shrink-0 active:scale-95 transition-all">
          <Avatar name={roomName} size="md" square={isGroup}
            profilePictureId={!isGroup ? peerStatus?.profilePictureId : null} />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-crisp-green rounded-full border-2 border-crisp-surface">
              <span className="absolute inset-0 rounded-full bg-crisp-green animate-ping opacity-75" />
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base text-crisp-text truncate">{roomName}</div>
          <div className={`text-xs font-mono mt-0.5 transition-colors
            ${typingUsers.length > 0 ? "text-crisp-teal" : isOnline ? "text-crisp-green" : "text-crisp-muted"}`}>
            {typingUsers.length > 0 ? `${typingUsers[0]} is typing…` : headerSub}
          </div>
        </div>

        {/* Search toggle */}
        <button onClick={() => { setSearching(!searching); setSearchQuery(""); setSearchResults([]); }}
          className="w-9 h-9 rounded-xl bg-crisp-card border border-crisp-border flex items-center justify-center active:scale-95 transition-all">
          <svg className="w-4 h-4 text-crisp-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* WS indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono flex-shrink-0
          ${wsConnected ? "bg-crisp-card border-crisp-border text-crisp-muted" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-crisp-green" : "bg-red-400 animate-pulse2"}`} />
          <span className="hidden sm:inline">{wsConnected ? "Live" : "Off"}</span>
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      {searching && (
        <div className="px-4 py-2 bg-crisp-surface border-b border-crisp-border flex-shrink-0 animate-slideDown">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crisp-muted pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="input-field pl-9 py-2.5 text-sm rounded-xl" style={{ minHeight: 40, fontSize: 14 }}
              placeholder="Search messages…" value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)} autoFocus />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 text-xs text-crisp-muted font-mono">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-0.5"
        style={{ overscrollBehavior: "contain" }}>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-crisp-border2"
                  style={{ animation: `bounceDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {!loading && fetched && (!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="text-5xl animate-float">👋</div>
            <div className="font-display font-semibold text-crisp-sub text-sm">Say hello to {roomName}!</div>
          </div>
        )}

        {/* Search results mode */}
        {searching && searchQuery && (
          <div className="mb-3">
            {searchResults.map((msg, i) => (
              <div key={msg.id || i}
                className="bg-crisp-card border border-crisp-accent/30 rounded-2xl px-4 py-3 mb-2 animate-fadeIn">
                <div className="text-xs text-crisp-muted font-mono mb-1">{msg.senderName} · {fmtTime(msg.timestamp)}</div>
                <p className="text-crisp-text text-sm font-body"
                  dangerouslySetInnerHTML={{ __html: msg.content?.replace(
                    new RegExp(searchQuery, "gi"),
                    (m) => `<mark class="bg-crisp-accent/30 text-crisp-accent2 rounded px-0.5">${m}</mark>`
                  ) }} />
              </div>
            ))}
            {searchResults.length === 0 && searchQuery && (
              <div className="text-center text-crisp-muted text-sm py-8 font-body">No messages found</div>
            )}
          </div>
        )}

        {/* Normal message list */}
        {!searching && grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-crisp-border/60" />
              <span className="text-[11px] text-crisp-muted font-mono px-3 py-1.5 bg-crisp-card border border-crisp-border rounded-full">{date}</span>
              <div className="flex-1 h-px bg-crisp-border/60" />
            </div>
            {msgs.map((msg, i) => (
              <MessageBubble
                key={msg.id || `${msg.roomId}-${i}`}
                msg={msg}
                isOwn={msg.senderId === username}
                showSender={isGroup && msg.senderId !== username}
                prevMsg={i > 0 ? msgs[i - 1] : null}
                currentUser={username}
                roomId={room.id}
                emojiOpen={emojiOpen}
                setEmojiOpen={setEmojiOpen}
                onContextMenu={(m, e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ msg: m });
                }}
                onAvatarClick={(uname) => setViewProfile(uname)}
              />
            ))}
          </div>
        ))}

        {typingUsers.length > 0 && <TypingBubble users={typingUsers} />}
        <div ref={bottomRef} />
      </div>

      {/* ── Context menu ───────────────────────────────────────────────────── */}
      {contextMenu && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setContextMenu(null)}>
          <div className="bg-crisp-surface border border-crisp-border2 rounded-2xl overflow-hidden
            shadow-2xl animate-scaleIn w-56" onClick={(e) => e.stopPropagation()}>
            {[
              { label: "Reply", icon: "↩", action: () => handleReply(contextMenu.msg) },
              { label: "Copy", icon: "📋", action: () => handleCopy(contextMenu.msg), show: !!contextMenu.msg.content },
              { label: "Forward", icon: "↗", action: () => handleForward(contextMenu.msg) },
              { label: "Edit", icon: "✏️", action: () => handleEdit(contextMenu.msg),
                show: canEdit(contextMenu.msg, username) },
              { label: "Delete for Me", icon: "🗑", action: () => handleDelete(contextMenu.msg, false),
                danger: true },
              { label: "Delete for Everyone", icon: "⛔", action: () => handleDelete(contextMenu.msg, true),
                show: canDeleteForEveryone(contextMenu.msg, username), danger: true },
            ].filter((item) => item.show !== false).map((item, i) => (
              <button key={i} onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-body
                  transition-colors border-b border-crisp-border/50 last:border-0
                  ${item.danger ? "text-red-400 hover:bg-red-500/10" : "text-crisp-text hover:bg-crisp-hover"}`}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Forward modal ───────────────────────────────────────────────────── */}
      {forwardMsg && (
        <ForwardModal
          message={forwardMsg}
          rooms={rooms || []}
          username={username}
          onForward={(targetRoomId) => {
            wsService.forwardMessage(forwardMsg.id, targetRoomId, username);
            setForwardMsg(null);
          }}
          onClose={() => setForwardMsg(null)}
        />
      )}

      {/* ── Upload progress ─────────────────────────────────────────────────── */}
      {uploading && (
        <div className="px-4 py-2 bg-crisp-surface border-t border-crisp-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-crisp-border rounded-full overflow-hidden">
              <div className="h-full bg-crisp-accent rounded-full transition-all" style={{ width: `${uploadProg}%` }} />
            </div>
            <span className="text-xs font-mono text-crisp-muted">{uploadProg}%</span>
          </div>
        </div>
      )}

      {/* ── Reply preview ───────────────────────────────────────────────────── */}
      {replyTo && !editingMsg && (
        <div className="px-4 py-2 bg-crisp-surface border-t border-crisp-border flex-shrink-0">
          <div className="flex items-center gap-2 bg-crisp-card border border-crisp-border rounded-xl px-3 py-2">
            <div className="w-0.5 h-full bg-crisp-accent rounded-full self-stretch" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-display font-semibold text-crisp-accent2">{replyTo.senderName || replyTo.senderId}</div>
              <div className="text-xs text-crisp-muted font-body truncate">{truncate(replyTo.content || "Media", 50)}</div>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-crisp-muted hover:text-crisp-sub p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Edit banner ─────────────────────────────────────────────────────── */}
      {editingMsg && (
        <div className="px-4 py-2 bg-crisp-surface border-t border-crisp-border flex-shrink-0">
          <div className="flex items-center gap-2 bg-crisp-accent/10 border border-crisp-accent/20 rounded-xl px-3 py-2">
            <span className="text-xs font-display font-semibold text-crisp-accent2">Editing message</span>
            <button onClick={() => { setEditingMsg(null); setText(""); }} className="ml-auto text-crisp-muted hover:text-crisp-sub p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div className="bg-crisp-surface border-t border-crisp-border px-3 sm:px-4 py-3 flex-shrink-0 input-bar">
        {isRecording ? (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse2" />
            <span className="flex-1 text-red-300 text-sm font-mono">
              Recording… {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, "0")}
            </span>
            <button onClick={stopRecording}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded-xl font-display font-semibold active:scale-95">
              Send
            </button>
            <button onClick={() => {
              clearInterval(recordTimer.current);
              setIsRecording(false);
              if (mediaRecRef.current) {
                mediaRecRef.current.ondataavailable = null;
                mediaRecRef.current.onstop = null;
                if (mediaRecRef.current.state !== "inactive") mediaRecRef.current.stop();
              }
            }} className="text-crisp-muted hover:text-red-400 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2 bg-crisp-card border border-crisp-border2 rounded-2xl px-3 py-2 focus-within:border-crisp-accent/40 transition-all">
            {/* Attach */}
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-crisp-muted hover:text-crisp-sub mb-0.5 disabled:opacity-40 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.64 16.2a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            {/* Text area */}
            <textarea ref={inputRef}
              className="flex-1 bg-transparent text-crisp-text font-body outline-none resize-none placeholder:text-crisp-muted leading-relaxed py-1"
              style={{ fontSize: 16, maxHeight: 120, minHeight: 28 }}
              placeholder={editingMsg ? "Edit message…" : wsConnected ? `Message ${roomName}…` : "Reconnecting…"}
              rows={1} value={text} onChange={handleTextChange} onKeyDown={handleKey} onBlur={stopTyping} />

            {/* Voice / Send */}
            {text.trim() ? (
              <button onClick={() => send()} disabled={!wsConnected}
                className="w-9 h-9 flex-shrink-0 bg-crisp-accent disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all active:scale-90 hover:bg-crisp-accent2">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            ) : (
              <button onMouseDown={startRecording} onTouchStart={startRecording}
                disabled={!wsConnected}
                className="w-9 h-9 flex-shrink-0 bg-crisp-card border border-crisp-border disabled:opacity-30 rounded-xl flex items-center justify-center transition-all active:scale-90 active:bg-red-500/20 hover:bg-crisp-hover">
                <svg className="w-4 h-4 text-crisp-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* ── Profile viewer ──────────────────────────────────────────────────── */}
      {viewProfile && (
        <ProfilePage username={viewProfile} onClose={() => setViewProfile(null)} />
      )}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, showSender, prevMsg, currentUser, roomId, emojiOpen, setEmojiOpen, onContextMenu, onAvatarClick }) {
  const sameAuthor = prevMsg?.senderId === msg.senderId;
  const reactions  = msg.reactions || {};
  const hasReacts  = Object.keys(reactions).some((k) => reactions[k]?.length > 0);
  const isPickerOpen = emojiOpen === msg.id;
  const mediaUrl   = getMediaUrl(msg.mediaFileId);
  const isDeleted  = msg.deletedForEveryone;

  useEffect(() => {
    if (!isPickerOpen) return;
    const close = () => setEmojiOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [isPickerOpen]);

  const doReact = (e, emoji) => { e.stopPropagation(); wsService.sendReaction(msg.id, roomId, emoji); setEmojiOpen(null); };

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""} ${sameAuthor ? "mt-0.5" : "mt-3"} group`}
      onContextMenu={(e) => onContextMenu(msg, e)}
      onLongPress={(e) => onContextMenu(msg, e)}>

      {/* Avatar */}
      <div className="w-8 flex-shrink-0 self-end mb-1">
        {!isOwn && !sameAuthor && (
          <button onClick={() => onAvatarClick(msg.senderId)}>
            <Avatar name={msg.senderName || msg.senderId} size="xs" />
          </button>
        )}
      </div>

      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[78%] sm:max-w-[70%]`}>
        {showSender && !sameAuthor && (
          <span className="text-[11px] text-crisp-muted font-display font-semibold mb-1 mx-1">
            {msg.senderName || msg.senderId}
          </span>
        )}

        {/* Forwarded label */}
        {msg.forwarded && !isDeleted && (
          <div className={`flex items-center gap-1 text-[10px] text-crisp-muted font-mono mb-1 mx-1`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 014-4h12"/>
            </svg>
            Forwarded
          </div>
        )}

        {/* Reply preview */}
        {msg.replyToMessageId && !isDeleted && (
          <div className={`mb-1 mx-1 px-3 py-1.5 rounded-xl border-l-2 border-crisp-accent
            bg-crisp-card/50 text-xs max-w-full`}>
            <div className="text-crisp-accent2 font-display font-semibold mb-0.5">
              {msg.replyToSenderName}
            </div>
            <div className="text-crisp-muted font-body truncate">{truncate(msg.replyToContent, 40)}</div>
          </div>
        )}

        {/* Bubble + emoji trigger */}
        <div className={`relative flex items-end gap-1.5 ${isOwn ? "flex-row-reverse" : ""}`}
          onClick={() => msg.id && !isDeleted && setEmojiOpen(isPickerOpen ? null : msg.id)}>

          <div className={isDeleted
            ? `${isOwn ? "bubble-own opacity-60 italic" : "bubble-them opacity-60 italic"} animate-msgIn`
            : `${isOwn ? "bubble-own animate-msgInR" : "bubble-them animate-msgIn"}`}>

            {/* Media */}
            {msg.mediaFileId && !isDeleted && (
              <div className="mb-1">
                {isImage(msg.mediaType) && (
                  <img src={mediaUrl} alt="media"
                    className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer"
                    onClick={() => window.open(mediaUrl, "_blank")} />
                )}
                {isVideo(msg.mediaType) && (
                  <video src={mediaUrl} controls className="rounded-xl max-w-full max-h-64" />
                )}
                {isAudio(msg.mediaType) && (
                  <audio src={mediaUrl} controls className="w-full min-w-[180px]" />
                )}
                {!isImage(msg.mediaType) && !isVideo(msg.mediaType) && !isAudio(msg.mediaType) && (
                  <a href={mediaUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs underline opacity-80 py-1">
                    📎 {msg.mediaName || "Download file"}
                  </a>
                )}
              </div>
            )}

            {/* Text */}
            {isDeleted ? (
              <span className="text-sm">🚫 This message was deleted</span>
            ) : (
              msg.content && <span>{msg.content}</span>
            )}
          </div>

          {/* Emoji picker trigger */}
          {msg.id && !isDeleted && (
            <div className="relative flex-shrink-0 mb-1">
              <button onClick={(e) => { e.stopPropagation(); setEmojiOpen(isPickerOpen ? null : msg.id); }}
                className="w-6 h-6 rounded-full bg-crisp-card border border-crisp-border items-center justify-center
                  text-[11px] hover:bg-crisp-hover mb-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                +
              </button>
              {isPickerOpen && (
                <div className={`absolute bottom-8 z-30 flex gap-1 p-2 bg-crisp-surface border border-crisp-border2
                  rounded-2xl shadow-2xl animate-scaleIn ${isOwn ? "right-0" : "left-0"}`}
                  onClick={(e) => e.stopPropagation()}>
                  {EMOJI_LIST.map((emoji) => {
                    const reacted = reactions[emoji]?.includes(currentUser);
                    return (
                      <button key={emoji} onClick={(e) => doReact(e, emoji)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 hover:scale-125
                          ${reacted ? "bg-crisp-accent/20 ring-1 ring-crisp-accent/50" : "hover:bg-crisp-hover"}`}
                        style={{ fontSize: 18 }}>{emoji}</button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reaction pills */}
        {hasReacts && !isDeleted && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
            {Object.entries(reactions).map(([emoji, users]) => {
              if (!users?.length) return null;
              const mine = users.includes(currentUser);
              return (
                <button key={emoji} onClick={() => wsService.sendReaction(msg.id, roomId, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all active:scale-95 font-mono
                    ${mine ? "bg-crisp-accent/20 border-crisp-accent/40 text-crisp-accent2" : "bg-crisp-card border-crisp-border text-crisp-muted hover:bg-crisp-hover"}`}>
                  <span style={{ fontSize: 13 }}>{emoji}</span>
                  <span>{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Time + edited label */}
        <div className={`flex items-center gap-1.5 mt-1 mx-1 ${isOwn ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-crisp-muted/70 font-mono">{fmtTime(msg.timestamp)}</span>
          {msg.edited && !isDeleted && (
            <span className="text-[10px] text-crisp-muted/50 font-mono italic">edited</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Forward Modal ──────────────────────────────────────────────────────────────
function ForwardModal({ message, rooms, username, onForward, onClose }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-crisp-surface border border-crisp-border2 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm
        shadow-2xl animate-slideBot sm:animate-scaleIn overflow-hidden"
        style={{ paddingBottom: `max(16px, env(safe-area-inset-bottom))` }}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-crisp-border2 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-display font-bold text-base text-crisp-text">Forward to…</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-crisp-card border border-crisp-border flex items-center justify-center text-crisp-muted text-xl active:scale-95">×</button>
        </div>
        <div className="px-2 max-h-64 overflow-y-auto">
          {rooms.filter((r) => r.id !== message.roomId).map((room) => {
            const name = getRoomName(room, username);
            return (
              <div key={room.id} onClick={() => setSelected(room.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all mb-1
                  ${selected === room.id ? "bg-crisp-accent/15 border border-crisp-accent/25" : "hover:bg-crisp-hover"}`}>
                <Avatar name={name} size="sm" square={room.isGroup || room.group} />
                <span className="font-display font-semibold text-sm text-crisp-text">{name}</span>
                {selected === room.id && <span className="ml-auto text-crisp-accent2 text-sm">✓</span>}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 px-5 pt-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => selected && onForward(selected)} disabled={!selected} className="btn-primary flex-1">
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Typing bubble ──────────────────────────────────────────────────────────────
function TypingBubble({ users }) {
  return (
    <div className="flex items-end gap-2.5 mt-2 animate-msgIn">
      <Avatar name={users[0]} size="xs" />
      <div className="flex items-center gap-1 px-4 py-3 bg-crisp-card border border-crisp-border rounded-2xl rounded-bl-sm">
        {[0,1,2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-crisp-muted"
            style={{ animation: `bounceDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <span className="text-[11px] text-crisp-muted font-mono italic pb-1">
        {users.length === 1 ? users[0] : `${users.length} people`}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-crisp-bg h-full">
      <div className="w-20 h-20 rounded-3xl bg-crisp-surface border border-crisp-border flex items-center justify-center animate-float">
        <svg className="w-9 h-9 text-crisp-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </div>
      <div className="text-center px-8">
        <div className="font-display font-semibold text-crisp-sub text-base mb-1">Select a conversation</div>
        <div className="font-body text-crisp-muted text-sm">Choose from the list or start a new one</div>
      </div>
    </div>
  );
}

function groupByDate(messages) {
  const map = {};
  messages.forEach((msg) => {
    const key = fmtDate(msg.timestamp) || "Today";
    if (!map[key]) map[key] = [];
    map[key].push(msg);
  });
  return Object.entries(map).map(([date, msgs]) => ({ date, msgs }));
}
