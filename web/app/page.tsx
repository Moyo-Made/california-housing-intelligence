import { Workbench } from "@/components/workbench/workbench";

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
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Educational · 1990 Census data
          </p>
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
      </main>
    </>
  );
}
