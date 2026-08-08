import { ArrowRight, CalendarHeart, HeartHandshake, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#fbfaf7] text-foreground">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-normal">Keepl</div>
          <Button variant="ghost" size="sm">
            Phase 0
          </Button>
        </header>

        <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              Private, person-centred memory keeping.
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
              Remember the people and details that make life feel close.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Keepl is set up with Next.js, TypeScript, Tailwind CSS, shadcn/ui,
              Firebase-ready dependencies, and PWA tooling.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="gap-2">
                Start local setup
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="outline">Read the plan</Button>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              {
                icon: UsersRound,
                title: "People first",
                text: "The core domain stays centered on the people that matter.",
              },
              {
                icon: CalendarHeart,
                title: "Dates and reminders",
                text: "Built to grow into birthdays, anniversaries, and gentle nudges.",
              },
              {
                icon: HeartHandshake,
                title: "Memories with context",
                text: "Notes, groups, relationships, and memories can connect back to a person.",
              },
            ].map((item) => (
              <article
                className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm"
                key={item.title}
              >
                <item.icon className="mb-4 size-5 text-primary" aria-hidden="true" />
                <h2 className="text-base font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
