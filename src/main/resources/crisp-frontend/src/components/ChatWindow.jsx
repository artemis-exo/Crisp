import React, { useEffect, useRef, useState, useCallback } from "react";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { getRoomName, fmtTime, fmtDate, fmtLastSeen, isVideo, isAudio, isImage } from "../utils/helpers";
import { getChatHistory, getUserStatus, uploadMedia, getMediaUrl } from "../services/api";
import { wsService } from "../services/websocket";

const EMOJI_LIST  = ["👍","❤️","😂","😮","😢","🔥","🎉","👀"];
const TYPING_STOP = 2500;

export default function ChatWindow({ room, messages, onNewMessage, wsConnected, onBack }) {
  const { username } = useAuth();
  const [text,        setText]        = useState("");
  const [loading,     setLoading]     = useState(false);
  const [fetched,     setFetched]     = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [peerStatus,  setPeerStatus]  = useState(null);
  const [emojiOpen,   setEmojiOpen]   = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const fileRef     = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);

  const isGroup  = room?.isGroup || room?.group;
  const roomName = room ? getRoomName(room, username) : "";

  useEffect(() => {
    if (!room) return;
    setFetched(false); setLoading(true); setTypingUsers([]);
    getChatHistory(room.id).then(({ data }) => { onNewMessage(room.id, data, true); setFetched(true); })
      .catch(() => setFetched(true)).finally(() => setLoading(false));
  }, [room?.id]);

  useEffect(() => {
    if (!room) return;
    wsService.subscribeRoom(room.id, (msg) => onNewMessage(room.id, [msg], false));
    wsService.subscribeTyping(room.id, (ev) => {
      if (ev.username === username) return;
      setTypingUsers((p) => ev.typing ? (p.includes(ev.username)?p:[...p,ev.username]) : p.filter((u)=>u!==ev.username));
      setTimeout(() => setTypingUsers((p) => p.filter((u) => u !== ev.username)), 4000);
    });
  }, [room?.id, wsConnected]);

  useEffect(() => {
    if (!room || isGroup) return;
    const peer = (room.participantIds||[]).find((u)=>u!==username);
    if (!peer) return;
    getUserStatus(peer).then(({ data }) => setPeerStatus(data)).catch(()=>{});
    const iv = setInterval(() => {
      getUserStatus(peer).then(({ data }) => setPeerStatus(data)).catch(()=>{});
    }, 30000);
    return () => clearInterval(iv);
  }, [room?.id, isGroup]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages?.length, typingUsers.length]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    if (!wsService.connected || !room) return;
    if (!isTypingRef.current) { isTypingRef.current = true; wsService.sendTyping(room.id, username, true); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { isTypingRef.current = false; wsService.sendTyping(room.id, username, false); }, TYPING_STOP);
  };

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    if (isTypingRef.current && room) { isTypingRef.current = false; wsService.sendTyping(room.id, username, false); }
  }, [room, username]);

  const send = useCallback((mediaFileId=null, mediaType=null, mediaName=null) => {
    const content = text.trim();
    if (!content && !mediaFileId) return;
    if (!room || !wsService.connected) return;
    stopTyping();
    wsService.sendMessage(room.id, content||"", username, username, mediaFileId, mediaType, mediaName);
    setText("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; inputRef.current.focus(); }
  }, [text, room, username, stopTyping]);

  const handleKey = (e) => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); send(); } };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;
    setUploading(true); setUploadProgress(0);
    try {
      const { data } = await uploadMedia(file, (ev) => {
        if (ev.total) setUploadProgress(Math.round((ev.loaded*100)/ev.total));
      });
      send(data.fileId, data.mediaType, data.mediaName);
    } catch (err) { alert("Failed to upload file"); }
    finally { setUploading(false); setUploadProgress(0); e.target.value = ""; }
  };

  if (!room) return <EmptyState />;
  const grouped   = groupByDate(messages || []);
  const isOnline  = !isGroup && peerStatus?.status === "ONLINE";
  const headerSub = isGroup ? `${(room.participantIds||[]).length} members`
    : peerStatus ? fmtLastSeen(peerStatus.status, peerStatus.lastSeen) : "…";

  return (
    <div className="flex flex-col h-full bg-crisp-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-crisp-surface border-b border-crisp-border flex-shrink-0"
        style={{ paddingTop:`max(12px,env(safe-area-inset-top))` }}>
        <button onClick={onBack} className="lg:hidden w-9 h-9 rounded-xl bg-crisp-card border border-crisp-border flex items-center justify-center active:scale-95 transition-all">
          <svg className="w-4 h-4 text-crisp-sub" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="relative flex-shrink-0">
          <Avatar name={roomName} size="md" square={isGroup}
            profilePictureId={!isGroup ? peerStatus?.profilePictureId : null} />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-crisp-green rounded-full border-2 border-crisp-surface">
              <span className="absolute inset-0 rounded-full bg-crisp-green animate-ping opacity-75" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base text-crisp-text truncate">{roomName}</div>
          <div className={`text-xs font-mono mt-0.5 transition-colors ${typingUsers.length>0?"text-crisp-teal":isOnline?"text-crisp-green":"text-crisp-muted"}`}>
            {typingUsers.length > 0 ? `${typingUsers[0]} is typing…` : headerSub}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono flex-shrink-0 ${wsConnected?"bg-crisp-card border-crisp-border text-crisp-muted":"bg-red-500/10 border-red-500/20 text-red-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${wsConnected?"bg-crisp-green":"bg-red-400 animate-pulse2"}`} />
          <span className="hidden sm:inline">{wsConnected?"Live":"Off"}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-0.5" style={{ overscrollBehavior:"contain" }}>
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="flex gap-1.5">
              {[0,1,2].map(i=>(
                <div key={i} className="w-2 h-2 rounded-full bg-crisp-border2"
                  style={{ animation:`bounceDot 1.2s ease-in-out ${i*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        {!loading && fetched && (!messages||messages.length===0) && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="text-5xl animate-float">👋</div>
            <div className="font-display font-semibold text-crisp-sub text-sm">Say hello to {roomName}!</div>
          </div>
        )}
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-crisp-border/60" />
              <span className="text-[11px] text-crisp-muted font-mono px-3 py-1.5 bg-crisp-card border border-crisp-border rounded-full">{date}</span>
              <div className="flex-1 h-px bg-crisp-border/60" />
            </div>
            {msgs.map((msg, i) => (
              <MessageBubble key={msg.id||`${msg.roomId}-${i}`}
                msg={msg} isOwn={msg.senderId===username}
                showSender={isGroup&&msg.senderId!==username}
                prevMsg={i>0?msgs[i-1]:null}
                currentUser={username} roomId={room.id}
                emojiOpen={emojiOpen} setEmojiOpen={setEmojiOpen} />
            ))}
          </div>
        ))}
        {typingUsers.length > 0 && <TypingBubble users={typingUsers} />}
        <div ref={bottomRef} />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="px-4 pb-2 bg-crisp-surface border-t border-crisp-border flex-shrink-0">
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-1.5 bg-crisp-border rounded-full overflow-hidden">
              <div className="h-full bg-crisp-accent rounded-full transition-all" style={{ width:`${uploadProgress}%` }} />
            </div>
            <span className="text-xs font-mono text-crisp-muted">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-crisp-surface border-t border-crisp-border px-3 sm:px-4 py-3 flex-shrink-0 input-bar">
        <div className="flex items-end gap-2 bg-crisp-card border border-crisp-border2 rounded-2xl px-3 py-2 focus-within:border-crisp-accent/40 transition-all duration-200">
          {/* Attach */}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-crisp-muted hover:text-crisp-sub transition-colors mb-0.5 disabled:opacity-40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.64 16.2a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <textarea ref={inputRef}
            className="flex-1 bg-transparent text-crisp-text font-body outline-none resize-none placeholder:text-crisp-muted leading-relaxed py-1"
            style={{ fontSize:16, maxHeight:120, minHeight:28 }}
            placeholder={wsConnected?`Message ${roomName}…`:"Reconnecting…"}
            rows={1} value={text} onChange={handleTextChange} onKeyDown={handleKey} onBlur={stopTyping} />
          <button onClick={() => send()} disabled={!text.trim()||!wsConnected}
            className="w-9 h-9 flex-shrink-0 bg-crisp-accent disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 hover:bg-crisp-accent2">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleFileSelect} />
        <div className="text-center mt-1.5 text-[10px] text-crisp-muted/50 font-mono hidden sm:block">
          Enter · Send &nbsp;·&nbsp; Shift+Enter · New line &nbsp;·&nbsp; 📎 · Attach media
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isOwn, showSender, prevMsg, currentUser, roomId, emojiOpen, setEmojiOpen }) {
  const sameAuthor = prevMsg?.senderId === msg.senderId;
  const reactions  = msg.reactions || {};
  const hasReacts  = Object.keys(reactions).some((k) => reactions[k]?.length > 0);
  const isPickerOpen = emojiOpen === msg.id;
  const mediaUrl   = getMediaUrl(msg.mediaFileId);

  useEffect(() => {
    if (!isPickerOpen) return;
    const close = () => setEmojiOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [isPickerOpen]);

  const doReact = (e, emoji) => { e.stopPropagation(); wsService.sendReaction(msg.id, roomId, emoji); setEmojiOpen(null); };

  return (
    <div className={`flex items-end gap-2 ${isOwn?"flex-row-reverse":""} ${sameAuthor?"mt-0.5":"mt-3"} group`}>
      <div className="w-8 flex-shrink-0 self-end mb-1">
        {!isOwn && !sameAuthor && <Avatar name={msg.senderName||msg.senderId} size="xs" />}
      </div>
      <div className={`flex flex-col ${isOwn?"items-end":"items-start"} max-w-[78%] sm:max-w-[70%]`}>
        {showSender && !sameAuthor && (
          <span className="text-[11px] text-crisp-muted font-display font-semibold mb-1 mx-1">{msg.senderName||msg.senderId}</span>
        )}
        <div className={`relative flex items-end gap-1.5 ${isOwn?"flex-row-reverse":""}`}>
          <div className={`${isOwn?"bubble-own animate-msgInR":"bubble-them animate-msgIn"}`}
            onClick={() => msg.id && setEmojiOpen(isPickerOpen?null:msg.id)}>
            {/* Media */}
            {msg.mediaFileId && (
              <div className="mb-1">
                {isImage(msg.mediaType) && <img src={mediaUrl} alt="media" className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer" onClick={() => window.open(mediaUrl,"_blank")} />}
                {isVideo(msg.mediaType) && <video src={mediaUrl} controls className="rounded-xl max-w-full max-h-64" />}
                {isAudio(msg.mediaType) && <audio src={mediaUrl} controls className="w-full min-w-[200px]" />}
                {!isImage(msg.mediaType)&&!isVideo(msg.mediaType)&&!isAudio(msg.mediaType) && (
                  <a href={mediaUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs underline opacity-80">
                    📎 {msg.mediaName||"Download file"}
                  </a>
                )}
              </div>
            )}
            {msg.content && <span>{msg.content}</span>}
          </div>
          {/* Emoji picker */}
          {msg.id && (
            <div className="relative flex-shrink-0 mb-1">
              <button onClick={(e)=>{e.stopPropagation();setEmojiOpen(isPickerOpen?null:msg.id);}}
                className="w-6 h-6 rounded-full bg-crisp-card border border-crisp-border items-center justify-center text-[11px] hover:bg-crisp-hover mb-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">+</button>
              {isPickerOpen && (
                <div className={`absolute bottom-8 z-30 flex gap-1 p-2 bg-crisp-surface border border-crisp-border2 rounded-2xl shadow-2xl animate-scaleIn ${isOwn?"right-0":"left-0"}`}
                  onClick={(e)=>e.stopPropagation()}>
                  {EMOJI_LIST.map((emoji) => {
                    const reacted = reactions[emoji]?.includes(currentUser);
                    return (
                      <button key={emoji} onClick={(e)=>doReact(e,emoji)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 hover:scale-125 ${reacted?"bg-crisp-accent/20 ring-1 ring-crisp-accent/50":"hover:bg-crisp-hover"}`}
                        style={{ fontSize:18 }}>{emoji}</button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Reaction pills */}
        {hasReacts && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn?"justify-end":"justify-start"}`}>
            {Object.entries(reactions).map(([emoji,users]) => {
              if (!users?.length) return null;
              const mine = users.includes(currentUser);
              return (
                <button key={emoji} onClick={()=>wsService.sendReaction(msg.id,roomId,emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all active:scale-95 font-mono ${mine?"bg-crisp-accent/20 border-crisp-accent/40 text-crisp-accent2":"bg-crisp-card border-crisp-border text-crisp-muted hover:bg-crisp-hover"}`}>
                  <span style={{fontSize:13}}>{emoji}</span><span>{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
        <span className="text-[10px] text-crisp-muted/70 font-mono mt-1 mx-1">{fmtTime(msg.timestamp)}</span>
      </div>
    </div>
  );
}

function TypingBubble({ users }) {
  return (
    <div className="flex items-end gap-2.5 mt-2 animate-msgIn">
      <Avatar name={users[0]} size="xs" />
      <div className="flex items-center gap-1 px-4 py-3 bg-crisp-card border border-crisp-border rounded-2xl rounded-bl-sm">
        {[0,1,2].map(i=>(
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-crisp-muted"
            style={{ animation:`bounceDot 1.2s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>
      <span className="text-[11px] text-crisp-muted font-mono italic pb-1">
        {users.length===1?users[0]:`${users.length} people`}
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
