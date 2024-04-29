import { cn } from "@/lib/utils";
import React, { useRef, useState, useEffect } from "react";

interface TickerTextProps {
  leadingIcon?: React.ReactNode;
  text: string;
}

const TickerText = ({ text, leadingIcon }: TickerTextProps) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (element) {
      // Check if the text is truncated
      setIsTruncated(element.scrollWidth > element.clientWidth);
    }
  }, [text]);

  return (
    <div className="flex w-full items-center justify-center gap-x-4">
      {leadingIcon}
      <div className="ticker-wrap">
        <p ref={textRef} className={cn(isTruncated && "ticker-text")}>
          {text || "Load File"}
        </p>
      </div>
    </div>
  );
};

export default TickerText;
