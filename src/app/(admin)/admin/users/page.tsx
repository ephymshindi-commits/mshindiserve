import { format } from "date-fns";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { prisma } from "@/lib/prisma";
import { labelFromEnum } from "@/lib/visuals";

export const dynamic = "force-dynamic";

async function getUsers() {
  try {
    return await prisma.user.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("[Admin Users]", error);
    return [];
  }
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div>
      <AdminSectionHeader
        title="Users"
        description="View customer and team accounts connected to the platform."
      />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-950">
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">User</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">Role</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">Phone</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">Joined</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-800/70">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-950 dark:text-white">{user.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{labelFromEnum(user.role)}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{user.phone ?? "Not set"}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                  {format(new Date(user.createdAt), "d MMM yyyy")}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {user.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="py-10 text-center text-sm text-zinc-400">No users found</div>
        )}
      </div>
    </div>
  );
}
