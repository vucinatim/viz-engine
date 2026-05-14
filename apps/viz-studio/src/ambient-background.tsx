import React from "react";

export const AmbientBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(85,161,255,0.24),transparent_26%),radial-gradient(circle_at_82%_16%,rgba(255,102,196,0.2),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(74,222,128,0.16),transparent_30%)]" />
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-xl" />
    </div>
  );
};
