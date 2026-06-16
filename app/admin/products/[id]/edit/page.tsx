// ── app/admin/products/[id]/edit/page.tsx ─────────────────────────────────────
// Full-page product editor — fetches the product and renders the edit form.
// Auth-gated: redirects to /admin if not logged in.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect, notFound }  from 'next/navigation'
import { isAdminAuthed }       from '@/lib/auth'
import { supabaseAdmin }       from '@/lib/supabase'
import EditForm                from './EditForm'
import type { Product }        from '@/lib/supabase'

export default async function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  if (!isAdminAuthed()) redirect('/admin')

  const { data } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!data) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-2">
          <a
            href="/admin/dashboard"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <h1 className="font-bold text-gray-900">Edit Product</h1>
        </div>
        <p className="text-xs text-gray-400 mb-5 ml-8">
          Changes go live immediately after publishing.
        </p>
      </div>
      <EditForm product={data as Product} />
    </div>
  )
}
