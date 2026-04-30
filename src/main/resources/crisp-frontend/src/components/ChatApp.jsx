import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar    from "./Sidebar";
import ChatWindow from "./ChatWindow";
import { useAuth }      from "../context/AuthContext";
import { getUserRooms } from "../services/api";
import { wsService }    from "../services/websocket";

export default function ChatApp() {
  const { token, username } = useAuth();
  const [rooms,       setRooms]       = useState([]);
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [messages,    setMessages]    = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [unread,      setUnread]      = useState({});
  const [mobileView,  setMobileView]  = useState("list");

  const activeRoomRef = useRef(null);
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  // Load rooms
  useEffect(() => {
    if (!username) return;
    getUserRooms(username).then(({ data }) => setRooms(data)).catch(() => {});
  }, [username]);

  // Connect WebSocket
  useEffect(() => {
    if (!token) return;
    wsService.connect(token,
      () => {
        setWsConnected(true);
        const r = activeRoomRef.current;
        if (r) {
          wsService.subscribeRoom(r.id, (msg) => handleNewMessage(r.id, [msg], false));
          wsService.subscribeTyping(r.id, () => {});
        }
      },
      () => setWsConnected(false)
    );
    return () => wsService.disconnect();
  }, [token]);

  const handleNewMessage = useCallback((roomId, msgs, replace = false) => {
    setMessages((prev) => {
      const existing = prev[roomId] || [];
      if (replace) return { ...prev, [roomId]: msgs };

      // Reaction update — replace message in-place by id
      if (msgs.length === 1 && msgs[0].id) {
        const idx = existing.findIndex((m) => m.id === msgs[0].id);
        if (idx !== -1) {
          const updated = [...existing];
          updated[idx] = msgs[0];
          return { ...prev, [roomId]: updated };
        }
      }

      return { ...prev, [roomId]: dedup([...existing, ...msgs]) };
    });

    // Increment unread for rooms not currently open
    if (!replace && activeRoomRef.current?.id !== roomId) {
      setUnread((p) => ({ ...p, [roomId]: (p[roomId] || 0) + msgs.length }));
    }
  }, []);

  const handleSelectRoom = (room) => {
    setActiveRoom(room);
    setUnread((p) => ({ ...p, [room.id]: 0 }));
    setMobileView("chat");
    wsService.subscribeRoom(room.id, (msg) => handleNewMessage(room.id, [msg], false));
    wsService.subscribeTyping(room.id, () => {});
  };

  const handleBack = () => { setMobileView("list"); setActiveRoom(null); };

  const handleRoomsChange = (newRoom) => {
    setRooms((p) => p.find((r) => r.id === newRoom.id) ? p : [newRoom, ...p]);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-crisp-bg">
      {/* Sidebar — full screen on mobile when mobileView="list" */}
      <div className={`${mobileView === "list" ? "flex" : "hidden"} lg:flex w-full lg:w-80 flex-shrink-0 h-full`}>
        <Sidebar
          rooms={rooms}
          activeRoomId={activeRoom?.id}
          onSelectRoom={handleSelectRoom}
          onRoomsChange={handleRoomsChange}
          wsConnected={wsConnected}
          messages={messages}
          unread={unread}
        />
      </div>

      {/* Chat — full screen on mobile when mobileView="chat" */}
      <main className={`${mobileView === "chat" ? "flex" : "hidden"} lg:flex flex-1 flex-col min-w-0 h-full`}>
        <ChatWindow
          room={activeRoom}
          messages={activeRoom ? messages[activeRoom.id] : null}
          onNewMessage={handleNewMessage}
          wsConnected={wsConnected}
          onBack={handleBack}
        />
      </main>
    </div>
  );
}

function dedup(msgs) {
  const seen = new Set();
  return msgs.filter((m) => {
    if (!m.id) return true;
    if (seen.has(m.id)) return false;
    seen.add(m.id); return true;
  });
}
