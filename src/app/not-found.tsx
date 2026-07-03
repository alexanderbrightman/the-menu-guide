import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#F4F2EE]">
      <h1 className="text-6xl font-bold text-gray-900">404</h1>
      <p className="text-gray-600 max-w-md">
        This page doesn&apos;t exist. The menu you&apos;re looking for may have
        been unpublished or the link may be incorrect.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        Back to home
      </Link>
    </div>
  )
}
