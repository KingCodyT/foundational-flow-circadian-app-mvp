import type { GetServerSideProps } from "next";
import { redirectToCanonicalRoute } from "@/lib/legacy-route-redirect";

export const getServerSideProps: GetServerSideProps = async (context) => {
	return redirectToCanonicalRoute(context, "/profile");
};

export default function LegacyYouRedirect() {
	return null;
}
