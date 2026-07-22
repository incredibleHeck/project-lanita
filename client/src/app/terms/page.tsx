import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Lanita SMS",
  description: "Terms of use for Lanita SMS school management software.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral dark:prose-invert">
      <p className="text-sm text-muted-foreground">
        <Link href="/login">Back to login</Link>
      </p>
      <h1>Terms of Service</h1>
      <p className="lead">Last updated: 22 July 2026</p>
      <h2>Service</h2>
      <p>
        Lanita SMS is provided to schools under a separate commercial or pilot
        agreement. Access is limited to authorized users of a school tenant.
      </p>
      <h2>Accounts</h2>
      <p>
        You must keep credentials confidential and change temporary passwords on
        first login. Privileged roles (admin/teacher) are invite-only.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not attempt to access another school’s data, abuse messaging channels,
        or disrupt the service. Schools remain responsible for the accuracy of
        student and fee data they enter.
      </p>
      <h2>Payments</h2>
      <p>
        Online fee payments are processed by Paystack. Refunds and disputes follow
        the school’s fee policy and Paystack’s processes.
      </p>
      <h2>Availability</h2>
      <p>
        We aim for continuous availability but do not guarantee uninterrupted
        service. Planned maintenance will be communicated when possible.
      </p>
      <h2>Liability</h2>
      <p>
        To the extent permitted by law, Lanita is not liable for indirect or
        consequential damages arising from use of the service. Schools retain
        responsibility for educational and fee decisions.
      </p>
      <p>
        See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </main>
  );
}
