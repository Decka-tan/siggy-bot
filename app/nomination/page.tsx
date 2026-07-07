import NominationClient from './NominationClient';
import { buildNominationsPayload } from '@/app/api/nominations/route';

export const revalidate = 60;

export default async function NominationPage() {
  const data = await buildNominationsPayload(false);
  return <NominationClient initialData={data as any} />;
}
