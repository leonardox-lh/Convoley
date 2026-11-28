import { VolleyballLoader } from "@/components/volleyball";

/** The shared hero stays in the layout; only the page below shows the ball while it loads. */
export default function AdminSectionLoading() {
  return <VolleyballLoader />;
}
