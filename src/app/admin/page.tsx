import { redirect } from "next/navigation";

type AdminIndexProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function AdminIndex({ searchParams = {} }: AdminIndexProps) {
  const query = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        query.append(key, item);
      });
    }
  });

  const queryString = query.toString();
  const target = queryString ? `/admin/productos?${queryString}` : "/admin/productos";

  redirect(target);
}
