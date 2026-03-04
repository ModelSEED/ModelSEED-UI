import { redirect } from 'next/navigation';

/**
 * `/biochem` redirects to `/biochem/reactions` — matching legacy behavior
 * where the default biochem page showed the Reactions tab.
 */
export default function BiochemPage() {
    redirect('/reference-data/reactions');
}
