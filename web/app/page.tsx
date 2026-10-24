import { MethodSection } from "@/components/explain/method-section";
import { Workbench } from "@/components/workbench/workbench";
import { MODEL_FACTS } from "@/lib/housing/model-facts";

export default function Home() {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-8">
          <p className="text-sm">
            <span className="font-semibold">California Housing Intelligence</span>
            <span className="text-muted-foreground">
              {" "}
              · A 1990 census model, explained
            </span>
          </p>
          <nav aria-label="Page" className="flex items-baseline gap-5">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">
              Educational · 1990 Census data
            </span>
            <a
              href="#method"
              className="text-sm underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              Method and limits
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-12 px-4 py-12 sm:gap-16 sm:px-8 sm:py-20">
        <div>
          <h1 className="max-w-3xl font-heading text-title font-medium text-balance sm:text-headline">
            Estimate the median home value of a 1990 California neighbourhood,
            as a Random Forest sees it.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
            The model was trained on census block groups from 1990. It estimates
            an area&rsquo;s median value, not the price of an individual home,
            and it is not a current valuation.
          </p>
        </div>
        <Workbench />
        <MethodSection />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-8 text-xs text-pretty text-muted-foreground sm:px-8">
          <p>
            Data: the California Housing dataset, built from the 1990 US Census by
            Pace and Barry (1997) and distributed through StatLib. Model:{" "}
            {MODEL_FACTS.model.toLowerCase()}, trained with {MODEL_FACTS.library}.
          </p>
          <p>An educational project. Not financial or real-estate advice.</p>
        </div>
      </footer>
    </>
  );
}
