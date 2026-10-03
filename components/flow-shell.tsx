"use client";

import { ReactNode } from "react";
import { JourneyFrame } from "@/components/journey-design";

export function FlowShell({ children }: { children: ReactNode }) {
  return <JourneyFrame image={3}><main className="journey-secondary">{children}</main></JourneyFrame>;
}
