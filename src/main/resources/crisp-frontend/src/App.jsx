import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./components/AuthPage";
import ChatApp  from "./components/ChatApp";

function Root() {
  const { isAuthed } = useAuth();
  return isAuthed ? <ChatApp /> : <AuthPage />;
}

export default function App() {
  return <AuthProvider><Root /></AuthProvider>;
}
