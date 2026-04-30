import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem("crisp_token"));
  const [username, setUsername] = useState(() => localStorage.getItem("crisp_user"));

  const signIn = (tok, user) => {
    localStorage.setItem("crisp_token", tok);
    localStorage.setItem("crisp_user",  user);
    setToken(tok); setUsername(user);
  };

  const signOut = () => {
    localStorage.removeItem("crisp_token");
    localStorage.removeItem("crisp_user");
    setToken(null); setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ token, username, signIn, signOut, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
