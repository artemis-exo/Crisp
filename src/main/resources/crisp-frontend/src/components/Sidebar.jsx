import React, { useState, useEffect } from "react";
import Avatar from "./Avatar";
import StoriesBar from "./StoriesBar";
import StoryViewer from "./StoryViewer";
import { useAuth } from "../context/AuthContext";
import { getRoomName, fmtTime } from "../utils/helpers";
import { getAllUsers, createRoom, getUserStatus, uploadProfilePic } from "../services/api";

export default function Sidebar({ rooms, activeRoomId, onSelectRoom, onRoomsChange, wsConnected, messages, unread = {} }) {
  const { username, signOut } = useAuth();
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState(false);
  const [myStatus,  setMyStatus]  = useState(null);
  const [storyViewer, setStoryViewer] = useState(null); // { startUser, grouped }
  const [stories,   setStories]   = useState({});

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  useEffect(() => {
    getUserStatus(username).then(({ data }) => setMyStatus(data)).catch(() => {});
  }, [username]);

  const filtered = rooms.filter((r) =>
    getRoomName(r, username).toLowerCase().includes(search.toLowerCase())
  );

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadProfilePic(file);
      getUserStatus(username).then(({ data }) => setMyStatus(data)).catch(() => {});
    } catch (err) { alert("Failed to upload profile picture"); }
    e.target.value = "";
  };

  return (
    <>
      <aside className="w-full lg:w-80 flex-shrink-0 bg-crisp-surface flex flex-col h-full border-r border-crisp-border overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-crisp-border"
          style={{ paddingTop:`max(16px,env(safe-area-inset-top))` }}>
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative">
              <div className="w-10 h-10 bg-crisp-accent rounded-2xl flex items-center justify-center font-mono font-bold text-white text-base shadow-accent-sm flex-shrink-0">C</div>
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-crisp-red rounded-full flex items-center justify-center text-[8px] text-white font-bold animate-scaleIn">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-base text-crisp-text">Crisp</div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${wsConnected ? "bg-crisp-green" : "bg-crisp-amber animate-pulse2"}`} />
                <span className="text-[11px] text-crisp-muted font-mono">{wsConnected ? "Connected" : "Connecting…"}</span>
              </div>
            </div>
            {/* Profile avatar with upload */}
            <label className="cursor-pointer" title="Change profile picture">
              <Avatar name={username} size="sm" online={wsConnected}
                profilePictureId={myStatus?.profilePictureId} />
              <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
            </label>
            <button onClick={signOut} className="w-9 h-9 rounded-xl bg-crisp-card border border-crisp-border flex items-center justify-center text-crisp-muted active:scale-95 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-crisp-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="input-field pl-10 py-2.5 text-sm rounded-xl" style={{ minHeight:40, fontSize:14 }}
              placeholder="Search conversations…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Stories */}
        <StoriesBar onOpenStories={(startUser, grouped) => { setStories(grouped); setStoryViewer(startUser); }} />

        {/* Room list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
              <div className="text-4xl opacity-30">💬</div>
              <div className="text-crisp-muted text-sm font-body">{search ? "No results" : "No conversations yet"}</div>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((room) => (
                <RoomItem key={room.id} room={room} active={room.id === activeRoomId}
                  onClick={() => onSelectRoom(room)} username={username}
                  lastMsg={(messages[room.id] || []).slice(-1)[0]}
                  unreadCount={unread[room.id] || 0} />
              ))}
            </div>
          )}
        </div>

        {/* New chat */}
        <div className="p-3 border-t border-crisp-border" style={{ paddingBottom:`max(12px,env(safe-area-inset-bottom))` }}>
          <button onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-crisp-accent/10
              hover:bg-crisp-accent/20 active:bg-crisp-accent/25 border border-crisp-accent/25
              text-crisp-accent2 font-display font-semibold text-sm transition-all duration-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Conversation
          </button>
        </div>
      </aside>

      {showModal && (
        <NewChatModal onClose={() => setShowModal(false)}
          onCreated={(room) => { onRoomsChange(room); setShowModal(false); onSelectRoom(room); }}
          myUsername={username} existingRooms={rooms} />
      )}

      {storyViewer && (
        <StoryViewer startUser={storyViewer} grouped={stories}
          onClose={() => setStoryViewer(null)}
          onStoryDeleted={() => setStoryViewer(null)} />
      )}
    </>
  );
}

function RoomItem({ room, active, onClick, username, lastMsg, unreadCount }) {
  const name    = getRoomName(room, username);
  const isGroup = room.isGroup || room.group;
  const preview = lastMsg
    ? `${lastMsg.senderId === username ? "You: " : ""}${lastMsg.content || (lastMsg.mediaType ? "📎 Media" : "")}`
    : "Tap to start chatting";
  return (
    <div className={`room-item ${active ? "active" : ""}`} onClick={onClick}>
      <Avatar name={name} size="md" square={isGroup} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-display font-semibold text-sm text-crisp-text truncate">{name}</span>
          {lastMsg?.timestamp && (
            <span className={`text-[10px] flex-shrink-0 font-mono ${unreadCount > 0 ? "text-crisp-accent2" : "text-crisp-muted"}`}>
              {fmtTime(lastMsg.timestamp)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs truncate font-body ${unreadCount > 0 ? "text-crisp-sub" : "text-crisp-muted"}`}>{preview}</span>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-crisp-accent text-white text-[10px] font-mono font-bold flex items-center justify-center animate-fadeIn">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function NewChatModal({ onClose, onCreated, myUsername, existingRooms }) {
  const [type, setType] = useState("dm");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    getAllUsers().then(({ data }) => setUsers(data.filter((u) => u.username !== myUsername)))
      .catch(() => setError("Could not load users")).finally(() => setUsersLoading(false));
  }, [myUsername]);

  const toggle = (u) => {
    if (type === "dm") { setSelected([u]); return; }
    setSelected((p) => p.includes(u) ? p.filter((x) => x !== u) : [...p, u]);
  };

  const handleCreate = async () => {
    if (!selected.length) { setError("Select at least one person"); return; }
    if (type === "group" && !groupName.trim()) { setError("Enter a group name"); return; }
    setLoading(true); setError("");
    try {
      const { data } = await createRoom({ participantIds:[myUsername,...selected], isGroup:type==="group", ...(type==="group"&&{name:groupName.trim()}) });
      onCreated(data);
    } catch (err) {
      const msg = err.friendlyMessage || "";
      if (msg.includes("already exists")) {
        const ex = existingRooms.find((r) => !(r.isGroup||r.group) && r.participantIds?.includes(selected[0]));
        if (ex) { onCreated(ex); return; }
      }
      setError(msg || "Failed to create conversation");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-crisp-surface border border-crisp-border2 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm
        shadow-2xl animate-slideBot sm:animate-scaleIn max-h-[92vh] flex flex-col overflow-hidden"
        style={{ paddingBottom:`max(16px,env(safe-area-inset-bottom))` }}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-crisp-border2 rounded-full" /></div>
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-display font-bold text-lg text-crisp-text">New Chat</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-crisp-card border border-crisp-border flex items-center justify-center text-crisp-muted text-xl active:scale-95">×</button>
        </div>
        <div className="px-6 pb-2 flex-1 overflow-y-auto">
          <div className="flex bg-crisp-bg rounded-2xl p-1 mb-5 border border-crisp-border gap-1">
            {[["dm","Direct"],["group","Group"]].map(([t,l]) => (
              <button key={t} onClick={() => { setType(t); setSelected([]); }}
                className={`flex-1 py-2.5 rounded-xl font-display font-semibold text-sm transition-all duration-200 ${type===t?"bg-crisp-accent text-white":"text-crisp-muted"}`}>{l}</button>
            ))}
          </div>
          {type === "group" && (
            <div className="mb-5">
              <label className="block text-xs font-display font-semibold text-crisp-muted uppercase tracking-widest mb-2">Group Name</label>
              <input className="input-field" placeholder="Team Alpha…" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
          )}
          <label className="block text-xs font-display font-semibold text-crisp-muted uppercase tracking-widest mb-2">
            {type==="dm"?"Select Person":"Add Members"}
          </label>
          <div className="bg-crisp-bg border border-crisp-border rounded-2xl overflow-hidden max-h-52 overflow-y-auto mb-4">
            {usersLoading ? <div className="py-8 text-center text-crisp-muted text-sm">Loading…</div>
            : users.length === 0 ? <div className="py-8 text-center text-crisp-muted text-sm px-4">No other users found.</div>
            : users.map((u) => {
              const sel = selected.includes(u.username);
              return (
                <div key={u.username} onClick={() => toggle(u.username)}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-crisp-hover border-b border-crisp-border/40 last:border-0 ${sel?"bg-crisp-accent/10":""}`}>
                  <Avatar name={u.fullName||u.username} size="sm" profilePictureId={u.profilePictureId} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-display font-semibold text-crisp-text truncate">{u.fullName||u.username}</div>
                    <div className="text-xs text-crisp-muted font-mono">@{u.username}</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0 ${sel?"bg-crisp-accent border-crisp-accent text-white":"border-crisp-border2"}`}>{sel&&"✓"}</div>
                </div>
              );
            })}
          </div>
          {error && <div className="mb-4 text-red-300 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">{error}</div>}
        </div>
        <div className="flex gap-2 px-6 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="btn-primary flex-1">{loading?"Creating…":"Start Chat"}</button>
        </div>
      </div>
    </div>
  );
}
