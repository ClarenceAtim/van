import NotFound from "@/app/not-found";

/** Shown (with a 404 status) when a non-admin requests /admin — we don't reveal that the area exists. */
export const metadata = { robots: { index: false, follow: false } };
export default NotFound;
