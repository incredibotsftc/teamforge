'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Shield } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export default function LegalPage() {
  return (
    <DashboardLayout pageTitle="Legal" pageIcon={Shield}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Template Notice:</strong> These are template legal documents. If you are deploying FTC TeamForge,
            you MUST customize these pages with your organization&apos;s specific information, contact details, and policies.
            The original FTC TeamForge creators do not collect any user data.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="license" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="license">License</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
            <TabsTrigger value="terms">Terms of Service</TabsTrigger>
          </TabsList>

          <TabsContent value="license" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>GNU Affero General Public License v3.0</CardTitle>
                <CardDescription>
                  FTC TeamForge is free and open-source software
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Version</span>
                      <span className="text-sm text-muted-foreground">0.1.0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Built by</span>
                      <span className="text-sm text-muted-foreground">Team Incredibots (#26336)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">License</span>
                      <span className="text-sm text-muted-foreground">GNU AGPL v3</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link
                      href="https://github.com/incredibotsftc/teamforge"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <span className="text-sm font-medium">View Source Code on GitHub</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                    <Link
                      href="https://github.com/incredibotsftc/teamforge/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <span className="text-sm font-medium">Report an Issue</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Full License Text</h3>
                  <div className="relative max-h-[600px] overflow-y-auto p-4 bg-muted rounded-md">
                    <pre className="text-xs whitespace-pre-wrap font-mono">{`FTC TeamForge - Team Management Platform for FIRST Tech Challenge
Copyright (C) 2025 Team Incredibots (#26336)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

For questions or support, visit: https://github.com/incredibotsftc/teamforge

GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>

Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.

Preamble

The GNU Affero General Public License is a free, copyleft license for software and other kinds of works, specifically designed to ensure cooperation with the community in the case of network server software.

The licenses for most software and other practical works are designed to take away your freedom to share and change the works. By contrast, our General Public Licenses are intended to guarantee your freedom to share and change all versions of a program--to make sure it remains free software for all its users.

When we speak of free software, we are referring to freedom, not price. Our General Public Licenses are designed to make sure that you have the freedom to distribute copies of free software (and charge for them if you wish), that you receive source code or can get it if you want it, that you can change the software or use pieces of it in new free programs, and that you know you can do these things.

Developers that use our General Public Licenses protect your rights with two steps: (1) assert copyright on the software, and (2) offer you this License which gives you legal permission to copy, distribute and/or modify the software.

A secondary benefit of defending all users' freedom is that improvements made in alternate versions of the program, if they receive widespread use, become available for other developers to incorporate. Many developers of free software are heartened and encouraged by the resulting cooperation. However, in the case of software used on network servers, this result may fail to come about. The GNU General Public License permits making a modified version and letting the public access it on a server without ever releasing its source code to the public.

The GNU Affero General Public License is designed specifically to ensure that, in such cases, the modified source code becomes available to the community. It requires the operator of a network server to provide the source code of the modified version running there to the users of that server. Therefore, public use of a modified version, on a publicly accessible server, gives the public access to the source code of the modified version.

An older license, called the Affero General Public License and published by Affero, was designed to accomplish similar goals. This is a different license, not a version of the Affero GPL, but Affero has released a new version of the Affero GPL which permits relicensing under this license.

The precise terms and conditions for copying, distribution and modification follow.

TERMS AND CONDITIONS

0. Definitions.
   "This License" refers to version 3 of the GNU Affero General Public License.

"Copyright" also means copyright-like laws that apply to other kinds of works, such as semiconductor masks.

"The Program" refers to any copyrightable work licensed under this License. Each licensee is addressed as "you". "Licensees" and "recipients" may be individuals or organizations.

To "modify" a work means to copy from or adapt all or part of the work in a fashion requiring copyright permission, other than the making of an exact copy. The resulting work is called a "modified version" of the earlier work or a work "based on" the earlier work.

A "covered work" means either the unmodified Program or a work based on the Program.

To "propagate" a work means to do anything with it that, without permission, would make you directly or secondarily liable for infringement under applicable copyright law, except executing it on a computer or modifying a private copy. Propagation includes copying, distribution (with or without modification), making available to the public, and in some countries other activities as well.

To "convey" a work means any kind of propagation that enables other parties to make or receive copies. Mere interaction with a user through a computer network, with no transfer of a copy, is not conveying.

An interactive user interface displays "Appropriate Legal Notices" to the extent that it includes a convenient and prominently visible feature that (1) displays an appropriate copyright notice, and (2) tells the user that there is no warranty for the work (except to the extent that warranties are provided), that licensees may convey the work under this License, and how to view a copy of this License. If the interface presents a list of user commands or options, such as a menu, a prominent item in the list meets this criterion.

1. Source Code.
   The "source code" for a work means the preferred form of the work for making modifications to it. "Object code" means any non-source form of a work.
   A "Standard Interface" means an interface that either is an official standard defined by a recognized standards body, or, in the case of interfaces specified for a particular programming language, one that is widely used among developers working in that language.

The "System Libraries" of an executable work include anything, other than the work as a whole, that (a) is included in the normal form of packaging a Major Component, but which is not part of that Major Component, and (b) serves only to enable use of the work with that Major Component, or to implement a Standard Interface for which an implementation is available to the public in source code form. A "Major Component", in this context, means a major essential component (kernel, window system, and so on) of the specific operating system (if any) on which the executable work runs, or a compiler used to produce the work, or an object code interpreter used to run it.

The "Corresponding Source" for a work in object code form means all the source code needed to generate, install, and (for an executable work) run the object code and to modify the work, including scripts to control those activities. However, it does not include the work's System Libraries, or general-purpose tools or generally available free programs which are used unmodified in performing those activities but which are not part of the work. For example, Corresponding Source includes interface definition files associated with source files for the work, and the source code for shared libraries and dynamically linked subprograms that the work is specifically designed to require, such as by intimate data communication or control flow between those subprograms and other parts of the work.

The Corresponding Source need not include anything that users can regenerate automatically from other parts of the Corresponding Source.

The Corresponding Source for a work in source code form is that same work.

[Full license text continues...]

For the complete license text, visit: https://www.gnu.org/licenses/agpl-3.0.html`}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
                <CardDescription>
                  Last Updated: {new Date().toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 prose prose-sm max-w-none dark:prose-invert">
                <section>
                  <h2 className="text-xl font-semibold">Introduction</h2>
                  <p>
                    This instance of FTC TeamForge is self-hosted and independently operated.
                    <strong> [CUSTOMIZE: Add your organization name and contact information here]</strong>
                  </p>
                  <p>
                    FTC TeamForge is open-source software licensed under the GNU Affero General Public License v3.
                    The original software creators (Team Incredibots #26336) do not collect, store, or have access
                    to any data from your deployment of this application.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Who Controls Your Data</h2>
                  <p>
                    All data entered into this application is stored in a database controlled by:
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <strong>[CUSTOMIZE: Add your organization&apos;s information:]</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Organization/Team Name: _____________</li>
                      <li>Contact Person: _____________</li>
                      <li>Email: _____________</li>
                      <li>Physical Address: _____________</li>
                      <li>Database Provider: _____________ (e.g., Supabase, PostgreSQL)</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Information We Collect</h2>
                  <p>This application may collect the following information:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Account Information:</strong> Name, email address, role (admin, mentor, student, parent)</li>
                    <li><strong>Team Information:</strong> Team number, team name, school affiliation, team member details</li>
                    <li><strong>Activity Data:</strong> Tasks, calendar events, notebook entries, budget information, mentoring logs</li>
                    <li><strong>Usage Data:</strong> Login times, feature usage patterns (if analytics are enabled by this deployment)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">COPPA Compliance (Users Under 13)</h2>
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="font-semibold mb-2">⚠️ Important for Teams with Young Students</p>
                    <p>
                      The Children&apos;s Online Privacy Protection Act (COPPA) requires parental consent for collecting
                      personal information from children under 13 years old.
                    </p>
                    <div className="mt-3">
                      <strong>[CUSTOMIZE: Choose and implement one of these approaches:]</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><strong>Option 1:</strong> Require all users to be 13+ years old</li>
                        <li><strong>Option 2:</strong> Obtain verifiable parental consent for users under 13</li>
                        <li><strong>Option 3:</strong> Only collect age-neutral information from students under 13</li>
                      </ul>
                    </div>
                    <p className="mt-3 text-sm">
                      Our current policy: <strong>[CUSTOMIZE: State your policy here]</strong>
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">How We Use Your Information</h2>
                  <p>The information collected is used to:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Provide team management and collaboration features</li>
                    <li>Enable communication between team members</li>
                    <li>Track team activities, tasks, and progress</li>
                    <li>Generate reports and analytics for team improvement</li>
                    <li>Maintain system security and prevent unauthorized access</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Data Storage and Security</h2>
                  <p>
                    Your data is stored in: <strong>[CUSTOMIZE: Specify your database provider and location]</strong>
                  </p>
                  <p>Security measures in place:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Encrypted connections (HTTPS/SSL)</li>
                    <li>Password hashing and secure authentication</li>
                    <li>Role-based access control (RLS policies)</li>
                    <li><strong>[CUSTOMIZE: Add any additional security measures you&apos;ve implemented]</strong></li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Third-Party Services</h2>
                  <p>This deployment may use the following third-party services:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Supabase:</strong> Database and authentication provider (if using Supabase)</li>
                    <li><strong>FTC Events API:</strong> Official FIRST Tech Challenge data for scouting features (optional)</li>
                    <li><strong>[CUSTOMIZE: List any additional services you use (analytics, error tracking, etc.)]</strong></li>
                  </ul>
                  <p className="mt-2">
                    Please review the privacy policies of these services for information about their data practices.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Data Sharing</h2>
                  <p>
                    <strong>[CUSTOMIZE: Describe when and how you share data. Example:]</strong>
                  </p>
                  <p>We do not sell or rent your personal information to third parties. We may share data:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Within your team/organization for collaboration purposes</li>
                    <li>With parent/guardian when requested for student accounts</li>
                    <li>When required by law or legal process</li>
                    <li>With your explicit consent</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Your Rights</h2>
                  <p>You have the right to:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Access your personal information</li>
                    <li>Request correction of inaccurate data</li>
                    <li>Request deletion of your account and data</li>
                    <li>Export your data in a portable format</li>
                    <li>Withdraw consent at any time</li>
                  </ul>
                  <p className="mt-2">
                    To exercise these rights, contact: <strong>[CUSTOMIZE: Add contact email/method]</strong>
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Data Retention</h2>
                  <p>
                    <strong>[CUSTOMIZE: Specify how long you retain data. Example:]</strong>
                  </p>
                  <p>
                    We retain your data for as long as your account is active or as needed to provide services.
                    Data may be retained for up to [X] days/months/years after account deletion for backup and legal purposes.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Cookies and Tracking</h2>
                  <p>
                    This application uses essential cookies for authentication and session management.
                    <strong>[CUSTOMIZE: If you use analytics or other tracking, disclose it here]</strong>
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Changes to This Policy</h2>
                  <p>
                    We may update this privacy policy from time to time. Changes will be posted on this page
                    with an updated revision date. Continued use of the application constitutes acceptance of changes.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Open Source Software</h2>
                  <p>
                    FTC TeamForge is open-source software licensed under the{' '}
                    <Link href="https://www.gnu.org/licenses/agpl-3.0.en.html" target="_blank" className="text-primary hover:underline">
                      GNU Affero General Public License v3
                    </Link>.
                    The source code is available at{' '}
                    <Link href="https://github.com/incredibotsftc/teamforge" target="_blank" className="text-primary hover:underline">
                      github.com/incredibotsftc/teamforge
                    </Link>.
                  </p>
                  <p className="mt-2">
                    Each deployment of this software is independently operated. The original software creators
                    do not collect, access, or control any data from deployments.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Contact Information</h2>
                  <div className="bg-muted p-4 rounded-lg">
                    <p><strong>[CUSTOMIZE: Add your contact information for privacy inquiries:]</strong></p>
                    <ul className="list-none mt-2 space-y-1">
                      <li>Privacy Contact: _____________</li>
                      <li>Email: _____________</li>
                      <li>Phone: _____________</li>
                      <li>Address: _____________</li>
                    </ul>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    For questions about the FTC TeamForge software itself, visit{' '}
                    <Link href="https://github.com/incredibotsftc/teamforge" target="_blank" className="text-primary hover:underline">
                      the project repository
                    </Link>.
                  </p>
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Terms of Service</CardTitle>
                <CardDescription>
                  Last Updated: {new Date().toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 prose prose-sm max-w-none dark:prose-invert">
                <section>
                  <h2 className="text-xl font-semibold">Introduction</h2>
                  <p>
                    Welcome to this deployment of FTC TeamForge. By accessing or using this application, you agree
                    to be bound by these Terms of Service.
                  </p>
                  <p>
                    This instance is operated by: <strong>[CUSTOMIZE: Add your organization name]</strong>
                  </p>
                  <p>
                    Contact: <strong>[CUSTOMIZE: Add contact email/method]</strong>
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">About FTC TeamForge</h2>
                  <p>
                    FTC TeamForge is open-source software licensed under the{' '}
                    <Link href="https://www.gnu.org/licenses/agpl-3.0.en.html" target="_blank" className="text-primary hover:underline">
                      GNU Affero General Public License v3 (AGPL-3.0)
                    </Link>.
                    The source code is available at{' '}
                    <Link href="https://github.com/incredibotsftc/teamforge" target="_blank" className="text-primary hover:underline">
                      github.com/incredibotsftc/teamforge
                    </Link>.
                  </p>
                  <p>
                    Each deployment of FTC TeamForge is independently operated. These Terms of Service apply
                    to this specific deployment only. The original software creators (Team Incredibots #26336)
                    are not responsible for how this deployment is operated or managed.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Eligibility and Age Requirements</h2>
                  <div className="bg-muted p-4 rounded-lg">
                    <p><strong>[CUSTOMIZE: Choose your age policy. Examples below:]</strong></p>
                    <p className="mt-2"><strong>Option 1 - Teen and Adult Only:</strong></p>
                    <p>You must be at least 13 years old to use this application. Users under 13 are not permitted.</p>

                    <p className="mt-3"><strong>Option 2 - With Parental Consent:</strong></p>
                    <p>
                      Users between 13-17 may use this application. Users under 13 require verifiable parental consent
                      and must have their account managed by a parent or guardian.
                    </p>

                    <p className="mt-3"><strong>Our Policy:</strong> [CUSTOMIZE: State your chosen policy here]</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Account Registration and Security</h2>
                  <ul className="list-disc list-inside space-y-2">
                    <li>You must provide accurate and complete information when creating an account</li>
                    <li>You are responsible for maintaining the confidentiality of your password</li>
                    <li>You are responsible for all activities that occur under your account</li>
                    <li>You must notify us immediately of any unauthorized access to your account</li>
                    <li>Accounts are for individual use only and may not be shared</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Acceptable Use Policy</h2>
                  <p>You agree NOT to:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Use the application for any illegal purpose or in violation of any laws</li>
                    <li>Harass, bully, or harm other users</li>
                    <li>Upload or share inappropriate, offensive, or harmful content</li>
                    <li>Attempt to gain unauthorized access to the system or other users&apos; accounts</li>
                    <li>Interfere with or disrupt the application or servers</li>
                    <li>Use the application to send spam or unsolicited communications</li>
                    <li>Impersonate another person or entity</li>
                    <li>Violate any intellectual property rights</li>
                    <li>Scrape, data mine, or use automated tools to access the application without permission</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">User Roles and Permissions</h2>
                  <p>The application supports different user roles:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Admin:</strong> Full access to manage team, members, and all features</li>
                    <li><strong>Mentor:</strong> Can manage team activities and view member information</li>
                    <li><strong>Student:</strong> Can participate in team activities with appropriate supervision</li>
                    <li><strong>Parent/Guardian:</strong> Can view their student&apos;s activities</li>
                  </ul>
                  <p className="mt-2">
                    <strong>[CUSTOMIZE: Add any additional role descriptions or permissions specific to your deployment]</strong>
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">User-Generated Content</h2>
                  <p>By creating content in the application (notes, tasks, calendar events, etc.), you:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Retain ownership of your content</li>
                    <li>Grant the deployment operator necessary rights to store and display your content</li>
                    <li>Represent that you have the right to post the content</li>
                    <li>Agree that your content does not violate any laws or third-party rights</li>
                  </ul>
                  <p className="mt-2">
                    We reserve the right to remove content that violates these Terms or applicable laws.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Intellectual Property</h2>
                  <p>
                    The FTC TeamForge software is licensed under the GNU Affero General Public License v3.
                    You can view the full license in the{' '}
                    <Link href="https://github.com/incredibotsftc/teamforge/blob/main/LICENSE.md" target="_blank" className="text-primary hover:underline">
                      LICENSE.md file
                    </Link>.
                  </p>
                  <p className="mt-2">
                    Under AGPL-3.0, you have the right to:
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Use, study, and modify the source code</li>
                    <li>Deploy your own instance of the software</li>
                    <li>Distribute copies or modified versions (under the same license)</li>
                  </ul>
                  <p className="mt-2">
                    If you modify and deploy this software, you must make the source code of your modifications
                    available to users under AGPL-3.0.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Disclaimers and Limitation of Liability</h2>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-semibold mb-2">IMPORTANT LEGAL NOTICE</p>
                    <p className="uppercase text-sm">
                      THIS APPLICATION IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED,
                      INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                      OR NON-INFRINGEMENT.
                    </p>
                    <p className="mt-3 text-sm">
                      As stated in the GNU AGPL-3.0 license (Section 15-16), there is NO WARRANTY for this program,
                      to the extent permitted by law.
                    </p>
                    <p className="mt-2 text-sm">
                      The deployment operator, to the maximum extent permitted by law, disclaims all liability for:
                    </p>
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                      <li>Data loss or corruption</li>
                      <li>Service interruptions or downtime</li>
                      <li>Errors, bugs, or security vulnerabilities</li>
                      <li>Damages arising from use or inability to use the application</li>
                      <li>Actions of other users</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Termination</h2>
                  <p>We reserve the right to:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Suspend or terminate your account for violation of these Terms</li>
                    <li>Modify or discontinue the application at any time</li>
                    <li>Remove content that violates these Terms or applicable laws</li>
                  </ul>
                  <p className="mt-2">
                    You may terminate your account at any time by contacting us at{' '}
                    <strong>[CUSTOMIZE: Add contact method]</strong>.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Educational Use and FIRST Tech Challenge</h2>
                  <p>
                    This application is designed to support FIRST Tech Challenge (FTC) teams.
                    Users should comply with all FIRST Tech Challenge rules, policies, and code of conduct.
                  </p>
                  <p className="mt-2">
                    FTC TeamForge is not affiliated with, endorsed by, or sponsored by FIRST®.
                    FIRST® and FIRST Tech Challenge® are registered trademarks of For Inspiration and Recognition
                    of Science and Technology (FIRST).
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Changes to These Terms</h2>
                  <p>
                    We may update these Terms of Service from time to time. Changes will be posted on this page
                    with an updated revision date. Continued use of the application after changes constitutes
                    acceptance of the modified Terms.
                  </p>
                  <p className="mt-2">
                    <strong>[CUSTOMIZE: Add how you will notify users of significant changes]</strong>
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Governing Law</h2>
                  <div className="bg-muted p-4 rounded-lg">
                    <p>
                      <strong>[CUSTOMIZE: Specify your governing law and jurisdiction. Example:]</strong>
                    </p>
                    <p className="mt-2">
                      These Terms shall be governed by the laws of [State/Country], without regard to conflict
                      of law provisions. Any disputes shall be resolved in the courts of [Jurisdiction].
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Contact Information</h2>
                  <div className="bg-muted p-4 rounded-lg">
                    <p><strong>[CUSTOMIZE: Add your contact information for legal inquiries:]</strong></p>
                    <ul className="list-none mt-2 space-y-1">
                      <li>Organization: _____________</li>
                      <li>Contact Person: _____________</li>
                      <li>Email: _____________</li>
                      <li>Phone: _____________</li>
                      <li>Address: _____________</li>
                    </ul>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    For questions about the FTC TeamForge software itself (not this deployment), visit{' '}
                    <Link href="https://github.com/incredibotsftc/teamforge" target="_blank" className="text-primary hover:underline">
                      the project repository
                    </Link>.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Acknowledgment</h2>
                  <p>
                    By using this application, you acknowledge that you have read, understood, and agree to be
                    bound by these Terms of Service and our Privacy Policy.
                  </p>
                </section>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
