// "/": login. Signed-in users never see this page; proxy.ts redirects them.
import { SignInPanel } from "./sign-in-panel";

const LOOP = [
  {
    title: "Diagnose",
    text: "Every wrong answer is classified: concept gap, application gap, or careless slip.",
  },
  {
    title: "Target",
    text: "Your roadmap follows the kind of mistake you make, not just the topic.",
  },
  {
    title: "Practise",
    text: "Daily drills, project defense interviews and a communication coach.",
  },
  { title: "Re-measure", text: "Readiness per company, with the arithmetic shown." },
];

export default function LoginPage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-4 py-16 md:grid-cols-2">
      <section>
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Placement prep that proves it
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">ProofPrep</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Know what to prepare, how ready you are for each company, and exactly what to fix next.
        </p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2">
          {LOOP.map((step, index) => (
            <li key={step.title} className="rounded-lg border p-4">
              <p className="text-sm font-semibold">
                {index + 1}. {step.title}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="bg-card mx-auto w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Get started</h2>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          Sign in to save your progress. The demo account has sample history.
        </p>
        <SignInPanel />
      </section>
    </main>
  );
}
