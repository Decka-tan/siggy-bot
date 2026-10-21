import { redirect } from 'next/navigation';

// Old address of the admin page; bookmarks and bot links still point here.
export default function LegacyDashboard({ searchParams }: { searchParams: Record<string, string> }) {
  const qs = new URLSearchParams(searchParams).toString();
  redirect(`/invoice/admin${qs ? `?${qs}` : ''}`);
}
