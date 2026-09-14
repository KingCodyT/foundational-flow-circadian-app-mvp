import type { AppProps } from "next/app";
import "@/app/globals.css";
import { CircadianProvider } from "@/components/circadian-provider";
import { NotificationTransportBridge } from "@/components/notification-transport-bridge";

export default function FoundationalFlowApp({
  Component,
  pageProps,
}: AppProps) {
  return (
    <CircadianProvider>
      <NotificationTransportBridge />
      <Component {...pageProps} />
    </CircadianProvider>
  );
}
