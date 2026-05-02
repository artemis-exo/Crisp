export const AVATAR_COLORS = [
  "bg-indigo-500/20 text-indigo-300",
  "bg-cyan-500/20 text-cyan-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
  "bg-violet-500/20 text-violet-300",
  "bg-sky-500/20 text-sky-300",
  "bg-teal-500/20 text-teal-300",
];

const cc = {};
export function avatarColor(name = "") {
  if (!cc[name]) {
    const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
    cc[name] = AVATAR_COLORS[idx];
  }
  return cc[name];
}

export function initials(name = "") {
  return name.split(/[\s_]+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export function fmtTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(date) {
  if (!date) return "";
  const d = new Date(date), t = new Date();
  if (d.toDateString() === t.toDateString()) return "Today";
  const y = new Date(t); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function getRoomName(room, me) {
  if (room.isGroup || room.group) return room.name || "Group";
  return (room.participantIds || []).filter((u) => u !== me).join(", ") || me;
}

export function fmtLastSeen(status, lastSeen) {
  if (status === "ONLINE") return "Online";
  if (!lastSeen) return "Offline";
  const now = new Date(), seen = new Date(lastSeen);
  const diffMin = Math.floor((now - seen) / 60000);
  if (diffMin < 1) return "Last seen just now";
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  if (seen.toDateString() === now.toDateString()) return `Last seen today at ${fmtTime(seen)}`;
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (seen.toDateString() === y.toDateString()) return `Last seen yesterday at ${fmtTime(seen)}`;
  return `Last seen ${Math.floor((now - seen) / 86400000)}d ago`;
}

export function fmtStoryTime(date) {
  if (!date) return "";
  const diff = Math.floor((new Date() - new Date(date)) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return "Yesterday";
}

export function fmtEditTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Can this message still be edited? (within 15 minutes)
export function canEdit(msg, username) {
  if (!msg || msg.senderId !== username) return false;
  if (msg.deletedForEveryone) return false;
  const age = Date.now() - new Date(msg.timestamp).getTime();
  return age < 15 * 60 * 1000;
}

// Can this message be deleted for everyone?
export function canDeleteForEveryone(msg, username) {
  if (!msg) return false;
  return msg.senderId === username && !msg.deletedForEveryone;
}

export function isVideo(type = "") { return type?.startsWith("video/"); }
export function isAudio(type = "") { return type?.startsWith("audio/"); }
export function isImage(type = "") { return type?.startsWith("image/"); }

export function truncate(str, n = 40) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}
