import type { GetServerSideProps } from "next";
import { redirectToCanonicalRoute } from "@/lib/legacy-route-redirect";

export const getServerSideProps: GetServerSideProps = async (context) => {
	return redirectToCanonicalRoute(context, "/today");
};

export default function LegacyNowRedirect() {
	return null;
}