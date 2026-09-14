"use client";

import { useEffect, useState } from "react";
import { subscribeToClock } from "@/lib/live-clock";

export function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => subscribeToClock(() => setNow(new Date())), []);
  return now;
}
