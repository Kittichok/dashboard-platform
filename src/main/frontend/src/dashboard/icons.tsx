type IconName = "dashboard" | "database" | "search" | "refresh" | "plus" | "copy" | "edit" | "trash" | "close" | "collapse" | "expand" | "download" | "upload";

const paths: Record<IconName, string> = {
  dashboard:
    "M3 4a1 1 0 0 1 1-1h6v7H3V4Zm11-1h6a1 1 0 0 1 1 1v6h-7V3ZM3 14h7v7H4a1 1 0 0 1-1-1v-6Zm11 0h7v6a1 1 0 0 1-1 1h-6v-7Z",
  database:
    "M12 5c-4.97 0-9 1.34-9 3s4.03 3 9 3 9-1.34 9-3-4.03-3-9-3Zm-9 7v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4 M3 16v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4",
  search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm5-2 4 4",
  refresh: "M20 6v5h-5 M4 18v-5h5 M18 9a6 6 0 0 0-10-3L4 10 M6 15a6 6 0 0 0 10 3l4-4",
  plus: "M12 5v14M5 12h14",
  copy: "M8 8h10v10H8z M6 14H5a1 1 0 0 1-1-1V5h8a1 1 0 0 1 1 1v1",
  edit: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z",
  trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 14h10l1-14 M9 7V4h6v3",
  close: "m6 6 12 12M18 6 6 18",
  collapse: "M15 6l-6 6 6 6",
  expand: "M9 6l6 6-6 6",
  download: "M12 3v12m-5-5l5 5 5-5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  upload: "M12 15V3m-5 5l5-5 5 5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
