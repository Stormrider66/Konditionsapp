// app/dev/role-info/page.tsx
// Development page to check user role and create test accounts
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function RoleInfoPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Get athlete account if exists
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: true,
    },
  })

  // Get clients if user is a coach
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    include: {
      athleteAccount: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
    take: 10,
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Development - Role Information</h1>

      <div className="space-y-6">
        {/* Current User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Role</p>
              <Badge variant="default" className="text-lg">
                {user.role}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="text-xs font-mono">{user.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Athlete Account Info */}
        {athleteAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Athlete Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Linked Client</p>
                <p className="font-medium">{athleteAccount.client.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client ID</p>
                <p className="text-xs font-mono">{athleteAccount.clientId}</p>
              </div>
              <Link href="/athlete/dashboard">
                <Button className="w-full">Go to Athlete Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Coach Info */}
        {user.role === 'COACH' && (
          <Card>
            <CardHeader>
              <CardTitle>Your Clients ({clients.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {clients.length === 0 ? (
                <div>
                  <p className="text-muted-foreground mb-4">
                    You don&apos;t have any clients yet. Create a client first, then an athlete
                    account will be created automatically if they have an email.
                  </p>
                  <Link href="/clients/new">
                    <Button>Create Client</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="border rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                        {client.athleteAccount && (
                          <Badge variant="secondary" className="mt-1">
                            Has Athlete Account
                          </Badge>
                        )}
                      </div>
                      {!client.athleteAccount && client.email && (
                        <Link href={`/clients/${client.id}`}>
                          <Button size="sm" variant="outline">
                            Create Athlete Account
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <Link href="/clients">
                      <Button className="w-full">Go to Coach Dashboard</Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Athlete Login Credentials for Testing */}
        {user.role === 'COACH' && clients.some((c) => c.athleteAccount) && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle>Athlete Login Credentials (For Testing)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To test the athlete portal in a separate browser window:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
                <li>Open a new Incognito/Private browser window</li>
                <li>Go to http://localhost:3005/login</li>
                <li>Use the credentials below to log in as an athlete</li>
              </ol>

              <div className="space-y-3 mt-4">
                {clients
                  .filter((c) => c.athleteAccount)
                  .map((client) => (
                    <div key={client.id} className="bg-white border rounded-lg p-3">
                      <p className="font-medium text-sm mb-2">{client.name}</p>
                      <div className="space-y-1 text-xs font-mono bg-gray-50 p-2 rounded">
                        <div>
                          <span className="text-muted-foreground">Email:</span>{' '}
                          <span className="font-semibold">{client.email}</span>
                        </div>
                        <div className="text-orange-600">
                          <span className="text-muted-foreground">Password:</span> Check the
                          console logs when you created this client, or reset the password
                        </div>
                      </div>
                      <Link href="/athlete/dashboard" target="_blank" rel="noopener">
                        <Button size="sm" variant="outline" className="w-full mt-2">
                          Open Athlete Dashboard (same session)
                        </Button>
                      </Link>
                    </div>
                  ))}
              </div>

              <p className="text-xs text-muted-foreground italic mt-4">
                Note: Passwords are only shown once when the client is created. Check your
                browser console or server logs to find them.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>How to Test Athlete Portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {user.role === 'COACH' ? (
              <>
                <p>
                  <strong>✨ Automatic Athlete Account Creation (NEW!)</strong>
                </p>
                <p className="text-muted-foreground">
                  When you create a new client with an email address, an athlete account is
                  automatically created! The login credentials will be shown in the success
                  message and logged to the console.
                </p>

                <p className="pt-3">
                  <strong>Testing in a separate window:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Create a client with an email (athlete account is auto-created)</li>
                  <li>Copy the temporary password from the success message</li>
                  <li>Open an Incognito/Private browser window</li>
                  <li>Go to http://localhost:3005/login</li>
                  <li>Log in with the client&apos;s email and temporary password</li>
                  <li>Now you can test coach view and athlete view side-by-side!</li>
                </ol>

                <p className="pt-3">
                  <strong>Manual Option: Use Prisma Studio</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Run: npx prisma studio</li>
                  <li>Open User table and change your role to ATHLETE</li>
                  <li>Create an AthleteAccount record linking your User to a Client</li>
                  <li>Refresh the page</li>
                </ol>
              </>
            ) : (
              <p>You&apos;re all set! You have athlete access.</p>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Link href="/">
              <Button variant="outline" className="w-full">
                Home
              </Button>
            </Link>
            {user.role === 'COACH' && (
              <Link href="/coach/programs">
                <Button variant="outline" className="w-full">
                  Coach Programs
                </Button>
              </Link>
            )}
            {user.role === 'ATHLETE' && (
              <Link href="/athlete/dashboard">
                <Button variant="outline" className="w-full">
                  Athlete Dashboard
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
