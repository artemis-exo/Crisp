import React from "react";
import { avatarColor, initials } from "../utils/helpers";
import { getMediaUrl } from "../services/api";

export default function Avatar({ name = "", size = "md", online = false, square = false, profilePictureId = null, className = "" }) {
  const sizes = { xs:"w-7 h-7 text-[10px]", sm:"w-9 h-9 text-xs", md:"w-11 h-11 text-sm", lg:"w-14 h-14 text-base", xl:"w-20 h-20 text-xl" };
  const dots  = { xs:"w-2 h-2", sm:"w-2.5 h-2.5", md:"w-3 h-3", lg:"w-3.5 h-3.5", xl:"w-4 h-4" };
  const sz    = sizes[size] || sizes.md;
  const radius = square ? "rounded-2xl" : "rounded-full";
  const imgUrl = getMediaUrl(profilePictureId);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {imgUrl ? (
        <img src={imgUrl} alt={name} className={`${sz} ${radius} object-cover`}
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
      ) : null}
      <div className={`${sz} ${avatarColor(name)} font-display font-bold flex items-center justify-center select-none ${radius} ${imgUrl ? "hidden" : "flex"}`}>
        {initials(name)}
      </div>
      {online && (
        <span className={`absolute bottom-0 right-0 ${dots[size] || dots.md} bg-crisp-green rounded-full border-2 border-crisp-surface`}>
          <span className="absolute inset-0 rounded-full bg-crisp-green animate-ping opacity-60" />
        </span>
      )}
    </div>
  );
}
