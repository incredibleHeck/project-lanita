import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Lanita SMS",
  description: "How Lanita SMS handles personal data for schools, staff, students, and parents.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral dark:prose-invert">
      <p className="text-sm text-muted-foreground">
        <Link href="/login">Back to login</Link>
      </p>
      <h1>Privacy Policy</h1>
      <p className="lead">Last updated: 22 July 2026</p>
      <p>
        Lanita SMS (HeckTeck School Management System) provides school
        administration software for schools and their staff, students, and
        parents/guardians.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details (name, email, role, school affiliation)</li>
        <li>Student records (admission, class, attendance, grades)</li>
        <li>Parent/guardian contacts (including WhatsApp numbers when provided)</li>
        <li>
          Billing metadata (invoices, payment references; card data is handled by
          Paystack)
        </li>
        <li>Security and audit logs</li>
      </ul>
      <h2>How we use data</h2>
      <ul>
        <li>Run academic, attendance, messaging, and billing workflows</li>
        <li>
          Send school-authorized notifications (WhatsApp / in-app) when consent is
          given
        </li>
        <li>Secure the service (authentication, abuse prevention, audit)</li>
      </ul>
      <h2>Sharing</h2>
      <p>
        Data is shared with authorized school staff, Paystack (payments), and Meta
        WhatsApp Cloud API when WhatsApp is enabled. We do not sell personal data.
      </p>
      <h2>Your rights</h2>
      <p>
        You may request access, correction, or deletion subject to applicable law
        (including Ghana’s Data Protection Act, 2012). Contact your school
        administrator to start a request.
      </p>
      <h2>Cookies</h2>
      <p>
        We use httpOnly session cookies for authentication. These are required for
        the service to function.
      </p>
      <p>
        See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </main>
  );
}
