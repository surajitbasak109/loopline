type PostStatus = "OPEN" | "PLANNED" | "IN_PROGRESS" | "DONE" | "DECLINED";

const config: Record<PostStatus, { label: string; classes: string }> = {
  OPEN: { label: "Open", classes: "bg-blue-50 text-blue-700" },
  PLANNED: { label: "Planned", classes: "bg-yellow-50 text-yellow-700" },
  IN_PROGRESS: { label: "In Progress", classes: "bg-purple-50 text-purple-700" },
  DONE: { label: "Done", classes: "bg-green-50 text-green-700" },
  DECLINED: { label: "Declined", classes: "bg-gray-100 text-gray-500" },
};

export default function StatusBadge({ status }: { status: PostStatus }) {
  const { label, classes } = config[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
