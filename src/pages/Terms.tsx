import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Terms = () => {
  const sections = [
    {
      title: "1. Introduction",
      content: [
        `Welcome to Eatora ("we," "our," or "us"). By accessing or using our website (eatora.tech, app.eatora.tech) and our meal generation services (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use Eatora.`,
        "The Service is operated from Cluj-Napoca, Romania, and these Terms are governed by Romanian law.",
      ],
    },
    {
      title: "2. The Service (AI Disclaimer)",
      content: [
        "Eatora uses Artificial Intelligence (OpenAI API) to generate recipes and meal plans based on user input.",
        "No Guarantee: We do not guarantee that the generated recipes will be error-free, tasty, or suitable for your specific dietary needs.",
        'AI Hallucinations: AI models can occasionally "hallucinate" or provide incorrect instructions. You agree to use common sense when following any recipe.',
      ],
    },
    {
      title: "3. Health & Medical Disclaimer (Read Carefully)",
      content: [
        "Eatora is a tool for information and entertainment, not a medical device or nutritionist.",
        "Nutritional Data: Any calories, macronutrients (protein, carbs, fats), or other nutritional data displayed are estimates only based on generic databases. Real-world values vary by brand and preparation.",
        "Not Medical Advice: Do not use Eatora to treat, cure, or prevent any disease. Consult a doctor before changing your diet, especially if you have pre-existing conditions (e.g., diabetes, eating disorders).",
        "Weight Changes: We are not responsible for any weight gain, weight loss, or lack of results experienced while using the app.",
      ],
    },
    {
      title: "4. Safety, Allergies, and Food Preparation",
      content: [
        "You are solely responsible for your health and safety in the kitchen.",
        "Allergies: AI-generated recipes may not list all allergens. You must manually verify every ingredient before cooking or consuming a meal. We are not liable for allergic reactions.",
        "Food Safety: You are responsible for verifying that your ingredients are fresh and safe to eat. You must cook meats, poultry, and seafood to safe internal temperatures to prevent foodborne illness.",
        "Physical Injury: We are not liable for cuts, burns, fires, or property damage resulting from cooking.",
      ],
    },
    {
      title: "5. Subscriptions & Payments",
      content: [
        "Billing: Payments are processed securely via Stripe. We do not store your credit card details.",
        "Automatic Renewal: Subscriptions renew automatically unless canceled at least 24 hours before the end of the current period.",
        "No Refunds: As Eatora is a digital service providing immediate access to content, all sales are final. We do not offer refunds for partial months or unused services, except where required by EU Consumer Law (14-day cooling-off period, which is waived once you start using the digital content).",
      ],
    },
    {
      title: "6. User Conduct",
      content: [
        "You agree not to misuse the Service. We reserve the right to ban any user who attempts to hack, reverse-engineer, or abuse the API (e.g., automated scraping).",
      ],
    },
    {
      title: "7. Limitation of Liability",
      content: [
        "To the maximum extent permitted by law, Eatora and its founder(s) shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits or health issues, arising from your use of the Service. In no event shall our total liability exceed the amount you paid to Eatora in the last 6 months.",
      ],
    },
    {
      title: "8. Governing Law",
      content: [
        "These Terms shall be governed by the laws of Romania. Any disputes shall be resolved in the competent courts of Cluj-Napoca, Romania.",
      ],
    },
    {
      title: "9. Contact",
      content: [
        "For support or legal inquiries, please contact us at: husarubusiness@yahoo.com (or your support email).",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-foreground">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-primary/80">
            Terms of Service
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
            Eatora Legal Terms
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
            Questions about these terms?{" "}
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

export default Terms;
