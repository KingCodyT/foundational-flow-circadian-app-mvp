import type { AppProps } from "next/app";
import "@/app/globals.css";
import { CircadianProvider } from "@/components/circadian-provider";

export default function FoundationalFlowApp({
  Component,
  pageProps,
}: AppProps) {
  return (
    <CircadianProvider>
      <Component {...pageProps} />
    </CircadianProvider>
  );
}
