import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";

export function redirectToCanonicalRoute(
  context: GetServerSidePropsContext,
  destinationPath: string,
): GetServerSidePropsResult<Record<string, never>> {
  const resolved = context.resolvedUrl || "";
  const queryIndex = resolved.indexOf("?");
  const query = queryIndex >= 0 ? resolved.slice(queryIndex) : "";

  return {
    redirect: {
      destination: `${destinationPath}${query}`,
      permanent: false,
    },
  };
}
