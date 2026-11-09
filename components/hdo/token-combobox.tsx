"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export interface TokenItem {
  value: string;
  label: string;
  /** Second line, e.g. device type and daily hours. */
  description?: string;
  /** Extra words matched by the search, e.g. aliases. */
  keywords?: string[];
  disabled?: boolean;
  /** Shown instead of the description for disabled items, e.g. "not supported yet". */
  note?: string;
  warning?: boolean;
}

export interface TokenGroup {
  heading?: string;
  description?: string;
  items: TokenItem[];
}

interface TokenComboboxProps {
  /** Text shown in the sentence. */
  text: string;
  isPlaceholder?: boolean;
  /** false → plain text (only one possible value). */
  interactive?: boolean;
  value: string | undefined;
  groups: TokenGroup[];
  onSelect: (value: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  /** Search is only useful for long lists. */
  searchable?: boolean;
}

/** A word in the selection sentence with a dashed underline that opens a searchable list. */
export function TokenCombobox({
  text,
  isPlaceholder,
  interactive = true,
  value,
  groups,
  onSelect,
  searchPlaceholder,
  emptyText,
  searchable = true,
}: TokenComboboxProps) {
  const [open, setOpen] = useState(false);

  if (!interactive) return <span className={cn("font-semibold", isPlaceholder && "text-white/50 italic")}>{text}</span>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline",
            "border-b-2 border-dashed",
            "font-semibold",
            isPlaceholder ? "border-white text-white/70 italic" : "border-white/50 text-white",
            "cursor-pointer outline-none hover:border-white focus-visible:border-white focus-visible:bg-white/15",
            isPlaceholder && "animate-pulse",
            "transition-colors",
          )}
        >
          {text}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className={cn("w-[min(22rem,calc(100vw-2rem))]", "p-0")}>
        <Command>
          {searchable && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList className={cn("max-h-[min(24rem,60vh)]")}>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups.map((group, i) => (
              <CommandGroup key={group.heading ?? i} heading={group.heading && <GroupHeading {...group} />}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    keywords={[item.label, ...(item.keywords ?? [])]}
                    disabled={item.disabled}
                    onSelect={() => {
                      onSelect(item.value);
                      setOpen(false);
                    }}
                    className={cn("items-start", "gap-2")}
                  >
                    <CheckIcon className={cn("mt-0.5 shrink-0", item.value === value ? "opacity-100" : "opacity-0")} />
                    <span className={cn("flex flex-col")}>
                      <span className={cn("font-medium")}>{item.label}</span>
                      {(item.note ?? item.description) && (
                        <span className={cn("text-xs", item.warning ? "text-destructive" : "text-muted-foreground")}>
                          {item.note ?? item.description}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function GroupHeading({ heading, description }: TokenGroup) {
  return (
    <span className={cn("flex flex-col")}>
      <span>{heading}</span>
      {description && <span className={cn("font-normal normal-case", "opacity-80")}>{description}</span>}
    </span>
  );
}
