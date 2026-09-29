"use client";

import { useState } from "react";
import { addDays, mondayOf, rangeLabel, todayISO } from "@/lib/dates";
import type { SavedLayout, WorkspaceLayout } from "@/lib/workspace-types";
import ResumeProvider from "@/components/resume/ResumeProvider";
import ResumeEditorPanel from "@/components/resume/ResumeEditorPanel";
import ResumePreviewPanel from "@/components/resume/ResumePreviewPanel";
import AiOutputPanel from "@/components/panels/AiOutputPanel";
import WorkLogPanel from "@/components/panels/WorkLogPanel";
import Workspace, { type PanelMap } from "./Workspace";

export default function WorkspaceClient({
  initialLayout,
  initialPresets,
}: {
  initialLayout: WorkspaceLayout;
  initialPresets: SavedLayout[];
}) {
  const [monday, setMonday] = useState(() => mondayOf(todayISO()));

  const panels: PanelMap = {
    worklog: {
      title: "Work log",
      meta: rangeLabel(monday, addDays(monday, 6)),
      content: <WorkLogPanel monday={monday} setMonday={setMonday} />,
    },
    resume: { title: "Resume", meta: "Live preview", content: <ResumePreviewPanel /> },
    editor: { title: "Editor", meta: "Resume fields", content: <ResumeEditorPanel /> },
    ai: {
      title: "AI output",
      meta: "STAR · brag doc · skills",
      content: <AiOutputPanel monday={monday} />,
    },
  };

  return (
    <ResumeProvider>
      <Workspace panels={panels} initialLayout={initialLayout} initialPresets={initialPresets} />
    </ResumeProvider>
  );
}
