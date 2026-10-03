import Head from "next/head";
import { MealNotificationsProvider } from "@/components/meal-notifications";
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
      <Head><link rel="manifest" href="/manifest.webmanifest" /><link rel="apple-touch-icon" href="/push-icon-192.png" /><meta name="apple-mobile-web-app-capable" content="yes" /></Head>
      <NotificationTransportBridge />
      <MealNotificationsProvider><Component {...pageProps} /></MealNotificationsProvider>
    </CircadianProvider>
  );
}
