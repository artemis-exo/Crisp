import React, { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { getStories, createStory, markStoryView, deleteStory, uploadStoryMedia, getMediaUrl } from "../services/api";
import { fmtStoryTime, isVideo } from "../utils/helpers";

export default function StoriesBar({ onOpenStories }) {
  const { username } = useAuth();
  const [stories,  setStories]  = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchStories();
    const iv = setInterval(fetchStories, 30000);
    return () => clearInterval(iv);
  }, []);

  const fetchStories = () => {
    getStories().then(({ data }) => setStories(data)).catch(() => {});
  };

  // Group by username
  const grouped = {};
  stories.forEach((s) => {
    if (!grouped[s.username]) grouped[s.username] = [];
    grouped[s.username].push(s);
  });

  const myStories = grouped[username] || [];
  const others    = Object.entries(grouped).filter(([u]) => u !== username);

  const handleAddStory = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data } = await uploadStoryMedia(file);
      await createStory({ mediaFileId: data.fileId, mediaType: data.mediaType, caption: "", fullName: username });
      fetchStories();
    } catch (err) { alert("Failed to upload story"); }
    e.target.value = "";
  };

  return (
    <div className="px-3 py-3 border-b border-crisp-border">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
        {/* Add story button */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
          onClick={() => fileRef.current?.click()}>
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-crisp-card border-2 border-crisp-border
              flex items-center justify-center text-crisp-muted hover:border-crisp-accent transition-colors">
              {myStories.length > 0 ? (
                <StoryCircle stories={myStories} username={username} onClick={() => onOpenStories(username, grouped)} hasNew={true} />
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-crisp-accent rounded-full
              flex items-center justify-center border-2 border-crisp-surface text-white text-xs font-bold">+</div>
          </div>
          <span className="text-[10px] text-crisp-muted font-mono w-14 text-center truncate">My Story</span>
        </div>

        {/* Others */}
        {others.map(([uname, userStories]) => {
          const hasUnviewed = userStories.some((s) => !s.viewedBy?.includes(username));
          return (
            <div key={uname} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
              onClick={() => onOpenStories(uname, grouped)}>
              <StoryCircle stories={userStories} username={uname} hasNew={hasUnviewed} />
              <span className="text-[10px] text-crisp-muted font-mono w-14 text-center truncate">{uname}</span>
            </div>
          );
        })}
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddStory} />
    </div>
  );
}

function StoryCircle({ stories, username, hasNew, onClick }) {
  const latest = stories[0];
  const imgUrl = getMediaUrl(latest?.mediaFileId);
  return (
    <div onClick={onClick}
      className={`w-14 h-14 rounded-full p-0.5 ${hasNew ? "story-ring animate-storyGlow" : "story-ring-viewed"}`}>
      <div className="w-full h-full rounded-full overflow-hidden bg-crisp-card flex items-center justify-center">
        {imgUrl && !isVideo(latest?.mediaType) ? (
          <img src={imgUrl} alt={username} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center font-display font-bold text-base
            bg-indigo-500/20 text-indigo-300`}>
            {username[0]?.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
