# Crisp — Real-time Chat Frontend

A production-grade React + Tailwind frontend for the Crisp Spring Boot chat backend.

## Tech Stack

- **React 18** — UI framework
- **Tailwind CSS 3** — utility-first styling
- **@stomp/stompjs** — STOMP over WebSocket
- **sockjs-client** — WebSocket fallback transport
- **axios** — HTTP client

---

## Project Structure

```
crisp-frontend/
├── public/
│   └── index.html               # Google Fonts loaded here
├── src/
│   ├── components/
│   │   ├── AuthPage.jsx         # Login + Register
│   │   ├── ChatApp.jsx          # Root layout, WS bootstrap
│   │   ├── ChatWindow.jsx       # Message list + input
│   │   ├── Sidebar.jsx          # Room list + new chat modal
│   │   ├── Avatar.jsx           # Reusable avatar with online dot
│   │   └── MobileDrawer.jsx     # Slide-in sidebar on mobile
│   ├── context/
│   │   └── AuthContext.jsx      # JWT token + username global state
│   ├── services/
│   │   ├── api.js               # All REST API calls (axios)
│   │   └── websocket.js         # STOMP client singleton
│   ├── utils/
│   │   └── helpers.js           # initials, colors, time formatting
│   ├── App.jsx                  # Auth gate → ChatApp or AuthPage
│   ├── index.js                 # React root
│   └── index.css                # Tailwind base + custom components
├── .env                         # REACT_APP_API_URL
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Quick Start

### 1. Install dependencies

```bash
cd crisp-frontend
npm install
```

### 2. Configure the backend URL

Edit `.env` if your backend runs on a different port:

```env
REACT_APP_API_URL=http://localhost:8080
```

### 3. Start the dev server

```bash
npm start
```

Opens at **http://localhost:3000**

### 4. Build for production

```bash
npm run build
```

Output goes to `build/` — deploy to any static host (Vercel, Netlify, Nginx, etc.).

---

## Backend Endpoints Used

| Method | URL | Used in |
|--------|-----|---------|
| POST | `/api/auth/login` | AuthPage.jsx |
| POST | `/api/auth/register` | AuthPage.jsx |
| GET | `/api/rooms/user/{username}` | ChatApp.jsx |
| POST | `/api/rooms/create` | Sidebar.jsx |
| GET | `/api/rooms/{roomId}/history` | ChatWindow.jsx |
| GET | `/api/users` | Sidebar.jsx (new chat modal) |
| GET | `/api/users/online` | available via api.js |
| WS | `/ws` (SockJS) | websocket.js |
| STOMP SUB | `/topic/room/{roomId}` | ChatWindow.jsx |
| STOMP PUB | `/app/chat.sendMessage` | ChatWindow.jsx |

---

## Features

- **Auth** — JWT login & register with error handling
- **Real-time messaging** — STOMP over SockJS, auto-reconnects every 3s
- **1-1 & Group chats** — both room types fully supported
- **Message history** — fetched from MongoDB on room open
- **Online status** — green dot driven by WebSocket connect/disconnect events
- **Responsive** — full mobile layout with slide-in drawer sidebar
- **Message grouping** — messages grouped by date with dividers
- **Sender identity** — senderId always overridden server-side (your FIX 6)
- **Dark theme** — deep dark aesthetic throughout

---

## Adding the Required UserController

The new chat modal calls `GET /api/users`. Add this file to your backend:

**`src/main/java/com/artemis/crisp/controller/UserController.java`**

```java
package com.artemis.crisp.controller;

import com.artemis.crisp.model.User;
import com.artemis.crisp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/online")
    public ResponseEntity<List<User>> getOnlineUsers() {
        return ResponseEntity.ok(userService.getOnlineUsers());
    }
}
```

---

## Security Note

`User.java` has a `password` field. Add `@JsonIgnore` on it so the
hashed password is never sent to the frontend:

```java
@JsonIgnore
private String password;
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:8080` | Backend base URL |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS errors | Ensure `SecurityConfig.java` allows your frontend origin |
| WS not connecting | Check JWT is valid; backend logs the STOMP CONNECT frame |
| Users list empty | Add `UserController.java` to backend (see above) |
| Messages not saving | Confirm MongoDB is running on port 27017 |
| `application.yml` MongoDB URI | Make sure it reads `spring.data.mongodb.uri` not `spring.mongodb.uri` |
