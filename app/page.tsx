import { redirect } from 'next/navigation'

export default function Home() {
  // Middleware sẽ handle redirect
  // Trang này chỉ là fallback
  redirect('/login')
}
