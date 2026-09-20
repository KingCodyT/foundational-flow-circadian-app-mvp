import type { GetServerSideProps } from "next";
import { redirectToCanonicalRoute } from "@/lib/legacy-route-redirect";
export const getServerSideProps: GetServerSideProps = async context => redirectToCanonicalRoute(context, "/today");
export default function LegacyDailyRedirect() { return null; }
