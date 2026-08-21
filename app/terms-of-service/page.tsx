'use client';

import Link from 'next/link';
import { BRAND } from '@/config/brand';
import {
  LegalLayout,
  legalBullets,
  type LegalSection,
} from '@/components/legal/legal-layout';

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: (
      <p>
        By accessing or using {BRAND.name} (&quot;the Platform&quot;), operated by {BRAND.legalName}{' '}
        (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you agree to be bound by these Terms of
        Service. If you do not agree to these terms, you may not use the Platform. The Platform is
        provided for business use. If you use the Platform on behalf of an organization, you
        represent that you have authority to bind that organization, and &quot;you&quot; refers to
        both you and that organization. These terms apply to all users, including organizations,
        administrators, and individual users.
      </p>
    ),
  },
  {
    id: 'description',
    title: 'Description of Service',
    content: (
      <>
        <p>{BRAND.name} is a financial operations software platform that provides:</p>
        <ul className={legalBullets}>
          <li>Payment initiation, processing coordination, and management tooling</li>
          <li>Multi-level payment approval workflows</li>
          <li>Banking integrations and payment-file generation</li>
          <li>Expense tracking and reporting</li>
          <li>ERP and accounting system integrations</li>
          <li>Currency conversion information and coordination</li>
        </ul>
        <p>
          The Platform is software. All movement of funds is executed by licensed third-party
          financial institutions and payment providers (such as banks and mobile-money operators),
          not by us.
        </p>
      </>
    ),
  },
  {
    id: 'registration',
    title: 'Account Registration and Eligibility',
    content: (
      <>
        <p>
          To use {BRAND.name}, you must create an account and provide accurate, complete
          information, and keep it accurate and complete. You are responsible for:
        </p>
        <ul className={legalBullets}>
          <li>Maintaining the confidentiality of your account credentials</li>
          <li>All activities that occur under your account or through your credentials</li>
          <li>Notifying us immediately of any unauthorized use of your account</li>
          <li>Ensuring that your account information remains current and accurate</li>
          <li>
            Ensuring that the people you invite to your organization, and the roles and approval
            workflows you assign them, reflect the authority you actually intend them to have
          </li>
        </ul>
        <p>
          We may rely on any instruction submitted through valid credentials and approved through
          your organization&apos;s configured approval workflow as duly authorized by your
          organization.
        </p>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payment Processing',
    content: (
      <>
        <p>
          {BRAND.name} facilitates payment processing through third-party payment providers. By
          using our payment services, you acknowledge and agree that:
        </p>
        <ul className={legalBullets}>
          <li>
            We are not a bank, deposit-taking institution, money transmitter, or licensed financial
            institution, and funds handled in connection with your payments are not deposits with
            us and are not covered by any deposit insurance or guarantee scheme
          </li>
          <li>
            Payment execution is performed by, and subject to the terms, cut-off times, availability
            and fees of, the respective banks, mobile-money operators, and payment providers
          </li>
          <li>You are responsible for ensuring sufficient funds for scheduled payments</li>
          <li>
            You are solely responsible for the accuracy of beneficiary and payment details you (or
            your ERP data) supply. Payments executed in accordance with the details you provided are
            deemed correctly executed, even if those details were wrong
          </li>
          <li>
            Payment approvals within your organization are your responsibility to configure
            correctly, and any payment released through your configured workflow is deemed
            authorized by you
          </li>
          <li>
            Exchange rates are indicative and may vary at the time of transaction settlement
          </li>
          <li>
            You are responsible for all taxes, duties, and government charges arising from your
            payments and your use of the Platform; our fees are exclusive of taxes unless stated
            otherwise
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'compliance',
    title: 'Compliance, Sanctions, and Financial Crime',
    content: (
      <>
        <p>
          We and our payment partners are subject to anti-money-laundering, counter-terrorist
          financing, and sanctions laws. You agree that we may, without liability to you:
        </p>
        <ul className={legalBullets}>
          <li>
            Request information about you, your organization, your beneficiaries, and the purpose of
            transactions, and decline or suspend service until it is provided
          </li>
          <li>
            Delay, decline, reverse, or report any transaction that we or our partners reasonably
            suspect is unlawful, fraudulent, sanctioned, or in breach of these terms
          </li>
          <li>
            Suspend or restrict accounts while an investigation, regulatory inquiry, or legal
            process is pending, and disclose information to competent authorities where required
          </li>
        </ul>
        <p>
          You represent that neither you nor your beneficial owners are subject to sanctions, and
          that you will not use the Platform in or in connection with any sanctioned jurisdiction,
          person, or activity.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    content: (
      <>
        <p>You agree not to use the Platform to:</p>
        <ul className={legalBullets}>
          <li>Violate any applicable laws or regulations</li>
          <li>Process payments for illegal goods or services</li>
          <li>Engage in money laundering, terrorist financing, fraud, or sanctions evasion</li>
          <li>Circumvent payment approval workflows or security measures</li>
          <li>Attempt to gain unauthorized access to other accounts or systems</li>
          <li>Transmit viruses, malware, or other harmful code</li>
          <li>
            Reverse engineer, scrape, resell, or provide the Platform to third parties as a service
            bureau without our written consent
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-Party Services',
    content: (
      <p>
        The Platform interoperates with third-party services you choose to connect — including ERP
        and accounting systems, banks, and mobile-money operators. Those services are governed by
        their own terms, and we are not responsible for their acts, omissions, outages, data errors,
        processing delays, or fees. Where a third-party service is unavailable or returns incorrect
        data, our obligations are limited to reasonable efforts to restore the integration.
      </p>
    ),
  },
  {
    id: 'data-security',
    title: 'Data and Security',
    content: (
      <p>
        We implement industry-standard security measures to protect your data, including encryption
        of sensitive information at rest and in transit, secure connections for banking
        integrations, and two-factor authentication. However, no system is completely secure. You
        are responsible for maintaining the security of your own systems, devices, and credentials,
        and for reviewing your organization&apos;s activity. Our handling of personal data is
        described in our{' '}
        <Link href="/privacy-policy" className="font-medium text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    ),
  },
  {
    id: 'fees',
    title: 'Subscription and Fees',
    content: (
      <>
        <p>{BRAND.name} offers subscription-based pricing. By subscribing, you agree to:</p>
        <ul className={legalBullets}>
          <li>Pay all applicable fees for your chosen plan for each subscribed organization</li>
          <li>Automatic renewal unless you cancel before the renewal date</li>
          <li>Fee changes with 30 days prior notice</li>
          <li>
            Suspension of access for the affected organization if fees remain unpaid after notice;
            accrued fees survive suspension and termination
          </li>
        </ul>
        <p>
          See our{' '}
          <Link href="/cancellation-policy" className="font-medium text-primary hover:underline">
            Cancellation Policy
          </Link>{' '}
          and{' '}
          <Link href="/refund-policy" className="font-medium text-primary hover:underline">
            Refund Policy
          </Link>{' '}
          for more details.
        </p>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: (
      <p>
        The Platform, including its design, features, and content, is owned by {BRAND.legalName}{' '}
        and protected by intellectual property laws. You retain ownership of your data uploaded to
        the Platform. You grant us a limited license to host and process your data to provide,
        secure, and improve the services, and to comply with law. Feedback you provide may be used
        by us without restriction or obligation.
      </p>
    ),
  },
  {
    id: 'warranties',
    title: 'Disclaimer of Warranties',
    content: (
      <p>
        The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the
        maximum extent permitted by law, we disclaim all warranties, express or implied, including
        merchantability, fitness for a particular purpose, non-infringement, and any warranty that
        the Platform will be uninterrupted, error-free, or secure. We do not warrant the accuracy of
        data supplied by you, your ERP, or any third-party service, and nothing on the Platform
        constitutes financial, legal, tax, or accounting advice.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: (
      <>
        <p>
          To the maximum extent permitted by law, we shall not be liable for any indirect,
          incidental, special, consequential, exemplary, or punitive damages, or any loss of
          profits, revenue, data, goodwill, or business opportunities, arising from or related to
          your use of the Platform, even if advised of the possibility of such damages. Without
          limiting the foregoing, we are not liable for:
        </p>
        <ul className={legalBullets}>
          <li>
            Losses caused by acts or omissions of banks, mobile-money operators, ERP providers, or
            other third parties, including funds delayed, misrouted, or lost while in their systems
          </li>
          <li>
            Payments executed according to details or approvals supplied through your account or
            workflows
          </li>
          <li>Losses caused by compromised credentials or systems under your control</li>
          <li>Losses arising from suspension or refusal of service under the Compliance section</li>
        </ul>
        <p>
          Our total aggregate liability for all claims in any twelve-month period shall not exceed
          the subscription fees paid by you to us for the affected organization in the twelve months
          preceding the first claim. Some jurisdictions do not allow certain exclusions or
          limitations; in those jurisdictions our liability is limited to the greatest extent
          permitted by law. Nothing in these terms excludes liability that cannot be excluded by
          law, including for fraud or for death or personal injury caused by negligence.
        </p>
      </>
    ),
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    content: (
      <p>
        You will indemnify, defend, and hold harmless {BRAND.legalName} and its officers,
        directors, employees, and agents from and against any claims, losses, liabilities, damages,
        penalties, and expenses (including reasonable legal fees) arising out of or related to:
        (a) your use of the Platform; (b) your breach of these terms or of applicable law; (c) your
        payment instructions, beneficiary details, or approval-workflow configuration; (d) your
        content and data; or (e) disputes between you and your beneficiaries, customers, employees,
        or payment providers.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Suspension and Termination',
    content: (
      <p>
        We may suspend or terminate your access to the Platform for violation of these terms,
        suspected fraudulent or unlawful activity, risk to the Platform or other users, regulatory
        or partner requirements, or non-payment — immediately and without prior notice where we
        reasonably consider it necessary. Upon termination, your right to use the Platform ceases
        immediately. You may export your data within 30 days of termination, after which we may
        delete it, except where longer retention is required by law. Sections concerning fees
        accrued, intellectual property, disclaimers, limitation of liability, indemnification,
        governing law, and any provision that by its nature should survive, survive termination.
      </p>
    ),
  },
  {
    id: 'force-majeure',
    title: 'Force Majeure',
    content: (
      <p>
        We are not liable for any failure or delay caused by events beyond our reasonable control,
        including acts of God, natural disasters, war, terrorism, civil unrest, labour disputes,
        power or telecommunications failures, failures of banks, mobile-money operators or other
        third-party providers, epidemics, and acts of government or regulators.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law and Disputes',
    content: (
      <p>
        These terms are governed by the laws of {BRAND.legal.governingLaw}, without regard to
        conflict-of-laws principles. The parties will first attempt in good faith to resolve any
        dispute informally by contacting us. Any dispute not resolved within 30 days shall be
        subject to the exclusive jurisdiction of the courts of {BRAND.legal.governingLaw}, unless
        mandatory law provides otherwise. You and we each waive any right to a
        class action to the extent permitted by law.
      </p>
    ),
  },
  {
    id: 'general',
    title: 'General',
    content: (
      <p>
        These terms, together with the policies referenced in them, are the entire agreement between
        you and us regarding the Platform. If any provision is held unenforceable, the remainder
        stays in effect. Our failure to enforce a provision is not a waiver. You may not assign
        these terms without our consent; we may assign them in connection with a merger,
        acquisition, or sale of assets. You consent to receive notices and communications from us
        electronically, including by email and through the Platform.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to Terms',
    content: (
      <p>
        We may update these Terms of Service from time to time. We will notify you of material
        changes via email or through the Platform at least 14 days before they take effect, except
        where a change is required sooner by law. Continued use of the Platform after changes take
        effect constitutes acceptance of the updated terms; if you do not agree, you must stop
        using the Platform and may cancel your subscription.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <p>
        If you have questions about these Terms of Service, please contact us at{' '}
        <a
          href={`mailto:${BRAND.email.support}`}
          className="font-medium text-primary hover:underline"
        >
          {BRAND.email.support}
        </a>
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="August 21, 2026"
      sections={sections}
      footerLinks={[
        { href: '/privacy-policy', label: 'Privacy Policy' },
        { href: '/cancellation-policy', label: 'Cancellation Policy' },
        { href: '/refund-policy', label: 'Refund Policy' },
      ]}
    />
  );
}
