import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { BACKEND_URL } from "./api";

class WSService {
  constructor() {
    this.client         = null;
    this.subscriptions  = {};
    this.pendingSubs    = {};
    this.onConnectCb    = null;
    this.onDisconnectCb = null;
  }

  connect(token, onConnect, onDisconnect) {
    this.onConnectCb    = onConnect;
    this.onDisconnectCb = onDisconnect;
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${BACKEND_URL}/ws`),
      connectHeaders:   { Authorization: `Bearer ${token}` },
      reconnectDelay:   3000,
      onConnect: () => {
        if (this.onConnectCb) this.onConnectCb();
        Object.entries(this.pendingSubs).forEach(([key, { topic, cb }]) =>
          this._doSub(key, topic, cb));
      },
      onDisconnect: () => {
        this.subscriptions = {};
        if (this.onDisconnectCb) this.onDisconnectCb();
      },
      onStompError: (f) => console.error("STOMP:", f.headers?.message),
    });
    this.client.activate();
  }

  disconnect() {
    this.subscriptions = {}; this.pendingSubs = {};
    if (this.client) { this.client.deactivate(); this.client = null; }
  }

  _doSub(key, topic, cb) {
    if (!this.client?.connected || this.subscriptions[key]) return;
    this.subscriptions[key] = this.client.subscribe(topic, (f) => {
      try { cb(JSON.parse(f.body)); } catch (e) { console.error(e); }
    });
  }

  subscribeRoom(roomId, cb) {
    const key = `room:${roomId}`, topic = `/topic/room/${roomId}`;
    this.pendingSubs[key] = { topic, cb };
    if (this.client?.connected) this._doSub(key, topic, cb);
  }

  subscribeTyping(roomId, cb) {
    const key = `typing:${roomId}`, topic = `/topic/room/${roomId}/typing`;
    this.pendingSubs[key] = { topic, cb };
    if (this.client?.connected) this._doSub(key, topic, cb);
  }

  unsubscribeRoom(roomId) {
    [`room:${roomId}`, `typing:${roomId}`].forEach((key) => {
      delete this.pendingSubs[key];
      if (this.subscriptions[key]) {
        try { this.subscriptions[key].unsubscribe(); } catch (_) {}
        delete this.subscriptions[key];
      }
    });
  }

  // ── Publish helpers ───────────────────────────────────────────────────────
  _publish(destination, body) {
    if (!this.client?.connected) return false;
    this.client.publish({ destination, body: JSON.stringify(body) });
    return true;
  }

  sendMessage(roomId, content, senderName, senderId, mediaFileId, mediaType, mediaName,
              replyToMessageId, replyToContent, replyToSenderName) {
    return this._publish("/app/chat.sendMessage", {
      roomId, content: content || "", senderName, senderId, type: "CHAT",
      mediaFileId, mediaType, mediaName,
      replyToMessageId, replyToContent, replyToSenderName,
    });
  }

  sendTyping(roomId, username, typing) {
    this._publish("/app/chat.typing", { roomId, username, typing });
  }

  sendReaction(messageId, roomId, emoji) {
    this._publish("/app/chat.react", { messageId, roomId, emoji });
  }

  // ── NEW: Edit message ─────────────────────────────────────────────────────
  editMessage(messageId, roomId, newContent) {
    return this._publish("/app/chat.edit", { messageId, roomId, newContent });
  }

  // ── NEW: Delete message ───────────────────────────────────────────────────
  deleteMessage(messageId, roomId, forEveryone) {
    return this._publish("/app/chat.delete", { messageId, roomId, forEveryone });
  }

  // ── NEW: Forward message ──────────────────────────────────────────────────
  forwardMessage(messageId, targetRoomId, senderName) {
    return this._publish("/app/chat.forward", { messageId, targetRoomId, senderName });
  }

  get connected() { return !!this.client?.connected; }
}

export const wsService = new WSService();
