"use client";

import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Separator } from "./separator";
import SimpleTooltip from "./simple-tooltip";

interface CollapsibleGroupProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const CollapsibleGroup = ({
  label,
  description,
  children,
}: CollapsibleGroupProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Separator />
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full space-y-2 px-4"
      >
        <div className="flex items-center justify-between space-x-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full cursor-pointer">
              <SimpleTooltip
                text={description}
                trigger={
                  <div className="w-full flex items-center">
                    <div className="flex items-center gap-x-2 grow">
                      {description && <Info className="w-3 h-3 opacity-50" />}
                      <h4 className="text-xs font-semibold">{label}</h4>
                    </div>
                    {isOpen ? <ChevronUp /> : <ChevronDown />}
                  </div>
                }
              />
            </div>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </>
  );
};

export default CollapsibleGroup;
