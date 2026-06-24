import { BarChart3, FileText, Mail, MapPin, Search, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: BarChart3,
    title: "Website traffic",
    description: "Visitors, top pages, traffic sources, and engagement from Google Analytics 4.",
  },
  {
    icon: Search,
    title: "Search performance",
    description:
      "Impressions, clicks, and the queries bringing customers to you, from Search Console.",
  },
  {
    icon: Star,
    title: "Reputation",
    description: "Your Google rating, review count, and the latest feedback customers leave.",
  },
];

const steps = [
  {
    icon: MapPin,
    title: "Connect your site",
    text: "Add your website and link Google Analytics in a couple of clicks.",
  },
  {
    icon: FileText,
    title: "We write the brief",
    text: "Each month we turn the numbers into a plain-English report with clear next steps.",
  },
  {
    icon: Mail,
    title: "Delivered to you",
    text: "The brief lands in your inbox automatically — no dashboards to check.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-foreground">AnalyticsIQ</span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6">
        <section className="text-center py-24">
          <span className="inline-block rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            Monthly website briefs for small business
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground max-w-3xl mx-auto">
            Know what your website did this month — in plain English
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect Google Analytics, Search Console, and your Business Profile. Every month we turn
            the numbers into one clear brief with the few things worth acting on.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-20">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </Card>
          ))}
        </section>

        <section className="border-t border-border py-20">
          <h2 className="text-center text-2xl font-bold text-foreground">How it works</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card">
                  <s.icon className="h-5 w-5 text-brand" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">
                  {i + 1}. {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} AnalyticsIQ</span>
          <span>Built for small businesses that don&apos;t have time for dashboards.</span>
        </div>
      </footer>
    </div>
  );
}
