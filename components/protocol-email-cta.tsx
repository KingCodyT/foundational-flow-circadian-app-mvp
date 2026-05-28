"use client";

import { FormEvent, useState } from "react";
import { useCircadian } from "@/components/circadian-provider";
import { EmailDeliveryStatus } from "@/types/circadian";

export function ProtocolEmailCta({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailDeliveryStatus>("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const {
    insight,
    protocol,
    protocolLeadFirstName,
    protocolLeadEmail,
    recordProtocolLead,
    scores,
  } = useCircadian();

  if (!scores || !insight || !protocol || protocolLeadEmail) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!firstName.trim() || !email.trim()) {
      return;
    }

    recordProtocolLead(firstName, email);
    setEmailStatus("sending");
    setEmailMessage("");

    try {
      const response = await fetch("/api/send-protocol", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          email,
          scores,
          insight,
          protocol,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        configured: boolean;
        error?: string;
      };

      if (data.success) {
        setEmailStatus("sent");
        setEmailMessage("Your 7-day protocol is on its way.");
        return;
      }

      if (!data.configured) {
        setEmailStatus("not_configured");
        setEmailMessage(
          "Captured. Delivery is wired and will go live once provider settings are added.",
        );
        return;
      }

      setEmailStatus("error");
      setEmailMessage(data.error || "We could not send the protocol right now.");
    } catch {
      setEmailStatus("error");
      setEmailMessage("We could not send the protocol right now.");
    }
  };

  if (compact) {
    return (
      <section className="ff-glass-card rounded-[2rem] p-5">
        <div className="grid gap-4 lg:grid-cols-[0.54fr_0.46fr] lg:items-end">
          <div>
            <p className="ff-section-eyebrow text-xs uppercase text-[var(--color-muted)]">
              7-day protocol
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight">
              Want this plan in your inbox?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              Send the 7-day protocol so you can use it away from the browser.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-3">
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="First name"
              className="rounded-[1.1rem] border border-[var(--color-line)] bg-white/80 px-4 py-3 text-sm text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(179,145,80,0.5)]"
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="rounded-[1.1rem] border border-[var(--color-line)] bg-white/80 px-4 py-3 text-sm text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(179,145,80,0.5)]"
            />
            <button
              type="submit"
              disabled={emailStatus === "sending"}
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-charcoal)] px-5 py-3 text-sm font-medium text-[var(--color-cream)] transition hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]"
            >
              {emailStatus === "sending" ? "Sending..." : "Email me the protocol"}
            </button>
            <p className="text-xs leading-6 text-[var(--color-muted)]">
              {emailMessage ||
                `One clean copy of the plan, sent after results${protocolLeadFirstName ? ` for ${protocolLeadFirstName}` : ""}.`}
            </p>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="ff-glass-card rounded-[2.25rem] p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.56fr_0.44fr] lg:items-end">
        <div>
          <p className="ff-section-eyebrow text-xs uppercase text-[var(--color-muted)]">
            7-day protocol
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight lg:text-4xl">
            Want your 7-day protocol sent to your inbox?
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
            This is the natural next step after results. Get a clean copy of the plan so you can use it away from the browser.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            First name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name"
            className="rounded-[1.2rem] border border-[var(--color-line)] bg-white/80 px-4 py-3 text-sm text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(179,145,80,0.5)]"
          />
          <label className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="rounded-[1.2rem] border border-[var(--color-line)] bg-white/80 px-4 py-3 text-sm text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(179,145,80,0.5)]"
          />
          <button
            type="submit"
            disabled={emailStatus === "sending"}
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-charcoal)] px-5 py-3 text-sm font-medium text-[var(--color-cream)] transition hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]"
          >
            {emailStatus === "sending"
              ? "Sending..."
              : "Send me the 7-day protocol"}
          </button>
          <p className="text-xs leading-6 text-[var(--color-muted)]">
            {emailMessage ||
              "Email delivery is ready to be connected. Add provider settings and this handoff becomes real."}
          </p>
        </form>
      </div>
    </section>
  );
}
