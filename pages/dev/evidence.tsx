import type { GetStaticProps } from "next";

// Production requests (including Next data requests) get a real 404.
export const getStaticProps: GetStaticProps = async () => {
  if (process.env.NODE_ENV !== "development") return { notFound: true };
  return { props: {} };
};

// The compile-time condition also keeps the test controls out of production JS.
const EvidencePage = process.env.NODE_ENV === "development"
  ? require("@/views/dev-evidence-page").default
  : function UnavailableEvidencePage() { return null; };

export default EvidencePage;
