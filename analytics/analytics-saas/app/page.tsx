import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AnalyticsIQ</h1>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <section className="text-center mb-20">
          <h2 className="text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Analytics Briefs, Delivered
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Connect your Google Analytics, Search Console, and Business Profile. Get one intelligent
            brief delivered to your email and WhatsApp every month.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-lg transition-colors"
          >
            Get Started
          </Link>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
              GA4 Analytics
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Sessions, top pages, device trends, and user behavior. All in one place.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
              Search Console
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Top queries, clicks, impressions, and ranking opportunities. Track what works.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
              Business Profile
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Actions, phone calls, direction requests, and customer reviews in one view.
            </p>
          </div>
        </section>

        <section className="mt-20 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Powered by Claude AI. Secure. Simple. Automatic.
          </p>
        </section>
      </main>
    </div>
  );
}
