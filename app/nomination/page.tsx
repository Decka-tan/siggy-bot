import NominationClient from './NominationClient';
import { buildNominationsPayload } from '@/lib/nomination-payload';

export const revalidate = 60;

export default async function NominationPage() {
  const data = await buildNominationsPayload(false, { skipRedis: true, skipR2: true, skipDiscord: true });
  return <NominationClient initialData={data as any} />;
}
