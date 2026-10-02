import type { GetServerSideProps } from "next";
import { redirectToCanonicalRoute } from "@/lib/legacy-route-redirect";

export const getServerSideProps: GetServerSideProps = async context => redirectToCanonicalRoute(context, "/timeline");
export default function LegacyRedirect() { return null; }
