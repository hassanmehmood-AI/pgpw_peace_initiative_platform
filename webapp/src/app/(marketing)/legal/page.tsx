const termsOfEngagement = [
  {
    title: "Absolute Non-Violence",
    body: "This platform is a sanctuary. Threats, inciting violence, or organizing hostile actions are strictly prohibited and will result in immediate permanent banning and potential reporting to authorities.",
  },
  {
    title: "Respectful Dialogue",
    body: "Disagreements are expected, disrespect is not. Engage in constructive conversation regardless of affiliation.",
  },
  {
    title: "No Doxxing",
    body: "Sharing personal information of others without explicit consent is forbidden.",
  },
  {
    title: "Moderator Authority",
    body: "Our mediators and moderators have final say in dispute resolution on the platform. You agree to abide by their rulings to maintain platform peace.",
  },
];

export default function LegalPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-outline-variant bg-surface-bright">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-stack-lg md:px-margin-desktop">
          <h1 className="font-display-lg text-display-lg text-primary">Legal</h1>
          <p className="mt-4 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            The Terms of Engagement every member agrees to at registration, and how PGPW
            handles your data.
          </p>
        </div>
      </section>

      <section className="bg-surface-container-low">
        <div className="mx-auto flex w-full max-w-container-max flex-col gap-stack-lg px-margin-mobile py-stack-lg md:px-margin-desktop">
          {/* Terms of Engagement */}
          <div className="grid grid-cols-1 items-start gap-gutter md:grid-cols-12">
            <div className="md:sticky md:top-24 md:col-span-4">
              <h2 className="mb-2 font-headline-md text-headline-md text-primary">
                Terms of Engagement
              </h2>
              <div className="h-1 w-12 bg-primary" />
              <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
                Agreed to by every member during registration, before their account is
                activated.
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm md:col-span-8">
              <ul className="flex flex-col gap-6">
                {termsOfEngagement.map((term) => (
                  <li key={term.title} className="border-l-2 border-primary pl-4">
                    <h3 className="mb-1 font-label-bold text-label-bold text-on-surface">
                      {term.title}
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {term.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Data & Privacy */}
          <div className="grid grid-cols-1 items-start gap-gutter md:grid-cols-12">
            <div className="md:sticky md:top-24 md:col-span-4">
              <h2 className="mb-2 font-headline-md text-headline-md text-primary">
                Data &amp; Privacy
              </h2>
              <div className="h-1 w-12 bg-primary" />
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm md:col-span-8">
              <ul className="flex flex-col gap-4">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-1 text-primary">
                    check_circle
                  </span>
                  <div>
                    <h3 className="font-label-bold text-label-bold text-on-surface">
                      Data Sovereignty
                    </h3>
                    <p className="text-sm font-body-md text-on-surface-variant">
                      User data is never monetized. End-to-end encryption ensures
                      conversations remain private.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-1 text-primary">
                    check_circle
                  </span>
                  <div>
                    <h3 className="font-label-bold text-label-bold text-on-surface">
                      Algorithmic Neutrality
                    </h3>
                    <p className="text-sm font-body-md text-on-surface-variant">
                      No feed manipulation. Content is displayed chronologically or
                      based on user-defined priority.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-1 text-primary">
                    check_circle
                  </span>
                  <div>
                    <h3 className="font-label-bold text-label-bold text-on-surface">
                      Confidential Reporting
                    </h3>
                    <p className="text-sm font-body-md text-on-surface-variant">
                      Safety reports can be filed anonymously and are reviewed by our
                      mediation team under strict confidentiality.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="grid grid-cols-1 items-start gap-gutter md:grid-cols-12">
            <div className="md:sticky md:top-24 md:col-span-4">
              <h2 className="mb-2 font-headline-md text-headline-md text-primary">
                Disclaimer
              </h2>
              <div className="h-1 w-12 bg-primary" />
            </div>
            <div className="rounded-xl border border-primary bg-primary p-8 text-on-primary shadow-sm md:col-span-8">
              <p className="font-body-md text-body-md">
                PGPW is a mediation platform dedicated to non-violence and mediator
                neutrality — it is not an emergency response service. If you or someone
                else is in immediate physical danger, contact local emergency services
                right away.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
