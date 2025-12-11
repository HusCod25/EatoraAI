import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  const sections = [
    {
      title: "1. Who We Are",
      content: [
        'Eatora ("we") is the data controller for the information you provide. We are based in Romania and comply with the General Data Protection Regulation (GDPR).',
      ],
    },
    {
      title: "2. Data We Collect",
      content: [
        "Account Data: Your email address and name (for login and account management).",
        "Usage Data: The ingredients you input and the recipes you generate.",
        "Payment Data: We do not store your credit card numbers. All payment data is handled securely by Stripe.",
      ],
    },
    {
      title: "3. How We Use Your Data",
      content: [
        "To provide the AI meal generation service.",
        "To process your subscription payments.",
        "To send you important account updates (we do not spam).",
      ],
    },
    {
      title: "4. Third-Party Services",
      content: [
        "We share data only with essential service providers:",
        "• OpenAI: To generate the recipes (your ingredients are sent to the API).",
        "• Stripe: To process payments.",
        "• Vercel/Supabase: For hosting and database storage.",
      ],
    },
    {
      title: "5. Your Rights (GDPR)",
      content: [
        "You have the right to:",
        "• Access the data we hold about you.",
        "• Correct any inaccurate data.",
        '• Delete your account ("Right to be Forgotten"): You can request full deletion of your data by emailing us.',
      ],
    },
    {
      title: "6. Cookies",
      content: [
        "We use essential cookies solely to keep you logged in and ensure the app functions correctly.",
      ],
    },
    {
      title: "7. Contact",
      content: [
        "To exercise your rights, contact us at: husarubusiness@yahoo.com",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-foreground">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-primary/80">
            Privacy Policy
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
            How Eatora Protects Your Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Last Updated: December 10, 2025
          </p>
        </div>

        <div className="space-y-10 rounded-3xl border border-white/5 bg-black/30 p-8 shadow-2xl backdrop-blur">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold text-primary">{section.title}</h2>
              <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {section.content.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 text-sm">
          <div>
            Questions about this policy?{" "}
            <a href="mailto:husarubusiness@yahoo.com" className="text-primary hover:underline">
              husarubusiness@yahoo.com
            </a>
          </div>
          <Button asChild variant="secondary" className="rounded-full px-6">
            <Link to="/register">Back to Sign Up</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
