import { Header } from "@/components/Header";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { SubmissionForm } from "@/components/SubmissionForm";
import { LiveFeed } from "@/components/LiveFeed";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <DisclaimerBanner />
        
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Submission Form */}
          <section>
            <SubmissionForm />
          </section>
          
          {/* Right Column - Live Feed */}
          <section>
            <LiveFeed />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="mb-2">
            <strong className="text-foreground">Crisis Fact-Checker</strong> — 
            AI-Powered Distress Verification System
          </p>
          <p>
            This is an AI-based probability tool. Results are NOT official verification. 
            Always verify through official emergency services.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
