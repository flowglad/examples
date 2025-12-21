'use client';;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * DashboardSkeleton component displays a loading skeleton for the dashboard
 * Matches the structure of the Dashboard component
 */
export function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex min-h-screen w-full max-w-7xl flex-col p-8">
        <div className="w-full space-y-8">
          {/* Usage Info and Message Box */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-48" />
              </CardTitle>
              {/* Usage Meters */}
              <div className="space-y-2 pt-6">
                <div className="flex gap-x-2">
                  <Skeleton className="w-32 h-4" />
                </div>
                <div className="space-y-6">
                  {/* Message Generations Meter */}
                  {/* Show if has a balance (even if total is 0, show remaining) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="w-48 h-4" />

                      <Skeleton className="w-48 h-4" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Credit Top-Ups */}
              <div>
                <div className="w-full mt-2">
                  {/* 100 Messages Top-Up Button */}
                  <Skeleton className="w-full h-9" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 border-t">
              <Skeleton className="h-[300px] pt-4 bg-white" />
              <div className="space-y-6">
                {/* Message Input and Generate Button */}
                <div>
                  <div className="flex items-center gap-4">
                    {/* Message Input */}
                    <Skeleton className="flex-[0.75] w-full h-9" />

                    {/* Generate Message Button */}
                    <Skeleton className="flex-[0.25] w-full h-9" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
