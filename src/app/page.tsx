import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    // Redirect to appropriate dashboard based on role
    redirect(user.role === 'CLIENTE' ? '/cliente' : '/coletor');
  }

  // Redirect to login if not authenticated
  redirect('/login');
}
