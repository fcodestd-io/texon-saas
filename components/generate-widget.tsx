"use client";

import React, { useMemo } from "react";

interface GenerateWidgetProps {
  type: "inline_visualization" | "full_page_visualization";
  height?: string;
  children: React.ReactNode;
}

export function GenerateWidget({
  type,
  height = "320px",
  children,
}: GenerateWidgetProps) {
  // Parsing sintaks markdown dari children
  const parsedWidget = useMemo(() => {
    let rawText = "";

    if (typeof children === "string") {
      rawText = children;
    } else if (Array.isArray(children)) {
      rawText = children.map((c) => (typeof c === "string" ? c : "")).join("");
    } else if (React.isValidElement(children) && children.props?.children) {
      const inner = children.props.children;
      rawText = typeof inner === "string" ? inner : String(inner);
    }

    // Ekstrak kode blok di dalam ```
    const codeBlockMatch = rawText.match(/```(?:[a-z]*)\n([\s\S]*?)```/);
    const content = codeBlockMatch ? codeBlockMatch[1] : rawText;

    // Parsing metadata sederhana dari teks
    const skillsMatch = content.match(/<skills>(.*?)<\/skills>/);
    const ideaMatch = content.match(/\*\*Idea:\*\*\s*(.*)/);
    const visualTypeMatch = content.match(/\*\*Visual type:\*\*\s*(.*)/);

    const skills = skillsMatch ? skillsMatch[1].trim() : "chart";
    const idea = ideaMatch ? ideaMatch[1].trim() : "";
    const visualType = visualTypeMatch ? visualTypeMatch[1].trim() : "bar";

    return {
      skills,
      idea,
      visualType,
      rawContent: content,
    };
  }, [children]);

  return (
    <div
      className={`w-full relative flex flex-col justify-between border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-4 font-mono transition-all ${
        type === "full_page_visualization" ? "min-h-[500px]" : ""
      }`}
      style={{ height: type === "inline_visualization" ? height : undefined }}
    >
      {/* Header Info Widget */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800/80 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-medium tracking-widest text-neutral-500 uppercase">
            WIDGET: {parsedWidget.skills} ({parsedWidget.visualType})
          </span>
        </div>
        <span className="text-[9px] font-extralight tracking-widest text-neutral-400 uppercase border border-neutral-200 dark:border-neutral-800 px-1.5 py-0.5">
          {type}
        </span>
      </div>

      {/* Placeholder / Kontainer Visualisasi Engine */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-neutral-300 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-950/40 text-center space-y-2">
        <p className="text-xs font-sans text-neutral-700 dark:text-neutral-300 max-w-md">
          {parsedWidget.idea || "Visualisasi Data"}
        </p>
        <div className="text-[10px] text-neutral-400 dark:text-neutral-500 max-w-sm truncate">
          Tipe Chart:{" "}
          <span className="text-neutral-600 dark:text-neutral-300">
            {parsedWidget.visualType}
          </span>
        </div>
      </div>

      {/* Footer Meta */}
      <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800/60 flex items-center justify-between text-[9px] text-neutral-400">
        <span>STATUS: READY</span>
        <span>INTERACTIVE ENGINE</span>
      </div>
    </div>
  );
}
