import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

interface SimpleTooltipProps {
  trigger: React.ReactNode;
  text?: string;
}

const SimpleTooltip = ({ trigger, text }: SimpleTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        {text && (
          <TooltipContent align="start" className="text-xs">
            {text}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default SimpleTooltip;
