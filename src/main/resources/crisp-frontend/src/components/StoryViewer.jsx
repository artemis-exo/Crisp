import React, { useState, useEffect, useRef } from "react";
import { markStoryView, deleteStory, getMediaUrl } from "../services/api";
import { fmtStoryTime, isVideo } from "../utils/helpers";
import { useAuth } from "../context/AuthContext";

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({ startUser, grouped, onClose, onStoryDeleted }) {
  const { username } = useAuth();
  const users      = Object.keys(grouped);
  const [userIdx,  setUserIdx]  = useState(users.indexOf(startUser));
  const [storyIdx, setStoryIdx] = useState(0);
  const [paused,   setPaused]   = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const timerRef   = useRef(null);
  const videoRef   = useRef(null);

  const currentUser   = users[userIdx];
  const userStories   = grouped[currentUser] || [];
  const currentStory  = userStories[storyIdx];

  // Mark as viewed
  useEffect(() => {
    if (currentStory?.id) {
      markStoryView(currentStory.id).catch(() => {});
    }
  }, [currentStory?.id]);

  // Timer
  useEffect(() => {
    setElapsed(0);
    if (paused) return;
    timerRef.current = setInterval(() => {
      setElapsed((p) => {
        if (p >= 100) { goNext(); return 0; }
        return p + (100 / (STORY_DURATION / 100));
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [storyIdx, userIdx, paused]);

  const goNext = () => {
    if (storyIdx < userStories.length - 1) {
      setStoryIdx((p) => p + 1);
    } else if (userIdx < users.length - 1) {
      setUserIdx((p) => p + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIdx > 0) setStoryIdx((p) => p - 1);
    else if (userIdx > 0) {
      setUserIdx((p) => p - 1);
      setStoryIdx(0);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this story?")) return;
    await deleteStory(currentStory.id).catch(() => {});
    onStoryDeleted?.();
    goNext();
  };

  if (!currentStory) { onClose(); return null; }
  const mediaUrl = getMediaUrl(currentStory.mediaFileId);
  const isOwner  = currentStory.username === username;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-sm h-full max-h-screen flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3">
          {userStories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-none"
                style={{ width: i < storyIdx ? "100%" : i === storyIdx ? `${elapsed}%` : "0%" }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-2">
          <div className="w-9 h-9 rounded-full bg-crisp-card flex items-center justify-center
            font-bold text-white font-display">{currentUser[0]?.toUpperCase()}</div>
          <div className="flex-1">
            <div className="text-white text-sm font-display font-semibold">{currentStory.fullName || currentUser}</div>
            <div className="text-white/60 text-xs font-mono">{fmtStoryTime(currentStory.createdAt)}</div>
          </div>
          {isOwner && (
            <button onClick={handleDelete} className="text-white/70 hover:text-red-400 transition-colors p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
          )}
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Media */}
        <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
          {isVideo(currentStory.mediaType) ? (
            <video ref={videoRef} src={mediaUrl} className="w-full h-full object-contain"
              autoPlay muted playsInline loop />
          ) : (
            <img src={mediaUrl} alt="story" className="w-full h-full object-contain" />
          )}

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-16 left-0 right-0 px-6 py-3 bg-black/40 backdrop-blur-sm">
              <p className="text-white text-sm font-body text-center">{currentStory.caption}</p>
            </div>
          )}
        </div>

        {/* Tap zones */}
        <div className="absolute inset-0 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={goPrev} />
          <div className="flex-1 h-full cursor-pointer"
            onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
            onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)} />
          <div className="w-1/3 h-full cursor-pointer" onClick={goNext} />
        </div>

        {/* Viewers count */}
        {isOwner && currentStory.viewedBy?.length > 0 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="text-white/80 text-xs font-mono">{currentStory.viewedBy.length} viewed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
