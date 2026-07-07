import NominationClient from './NominationClient';
import { buildNominationsPayload } from '@/app/api/nominations/route';

export const revalidate = 60;

export default async function NominationPage() {
  const data = await buildNominationsPayload(false, { skipRedis: true, skipR2: true });
  return <NominationClient initialData={data as any} />;
}
