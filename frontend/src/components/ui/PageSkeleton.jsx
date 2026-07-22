import React from "react";

const PageSkeleton = () => {
  return (
    <div className="w-full h-[60vh] flex flex-col gap-4 p-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/3"></div>
      <div className="flex-1 bg-muted/50 rounded w-full mt-4"></div>
      <div className="h-10 bg-muted rounded w-1/4 self-end"></div>
    </div>
  );
};

export default PageSkeleton;
