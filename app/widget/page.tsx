import { Suspense } from "react";
import WidgetPanel from "./WidgetPanel";

// This page is served inside an iframe on the customer's site.
// It reads ?key=pk_... and talks to /api/public/* using that key.
export default function WidgetPage() {
  return (
    <Suspense>
      <WidgetPanel />
    </Suspense>
  );
}
