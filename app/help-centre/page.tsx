import { redirect } from 'next/navigation';
import { getApiUrl } from '@/config/api';

export default function HelpCentrePage() {
  // Redirect to the full help center on the backend
  redirect(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/help/`);
}
