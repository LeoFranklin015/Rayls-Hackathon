"use client";

import { useState } from "react";

interface AccordionItem {
  num: string;
  title: string;
  description: string;
}

export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.num} className="border-t border-border">
            <button
              onClick={() => setOpen(i)}
              className="flex w-full cursor-pointer items-baseline gap-12 py-8 text-left"
            >
              <span className="font-mono text-[14px] text-muted">
                {item.num}
              </span>
              <span
                className={`text-[20px] font-medium transition-colors ${
                  isOpen ? "text-accent" : "text-foreground"
                }`}
              >
                {item.title}
              </span>
            </button>

            {isOpen && (
              <div className="pb-10 pl-[calc(theme(spacing.12)+3.5rem)]">
                <p className="max-w-xl text-[16px] leading-[1.7] text-muted">
                  {item.description}
                </p>
              </div>
            )}
          </div>
        );
      })}
      <div className="border-t border-border" />
    </div>
  );
}
