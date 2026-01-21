'use client'

import {
  type ResourceClaim,
  useBilling,
  useResource,
} from '@flowglad/nextjs'
import {
  CheckCircle2,
  Circle,
  CreditCard,
  Loader2,
  Plus,
  Settings,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { authClient } from '@/lib/auth-client'

interface Issue {
  id: string
  title: string
  done: boolean
  createdAt: Date
}

export function HomeClient() {
  const router = useRouter()
  const { data: session, isPending: isSessionPending } =
    authClient.useSession()
  const billing = useBilling()
  const {
    usage: seatUsage,
    claims,
    claim,
    release,
    isLoading: isLoadingSeats,
    isLoadingClaims,
  } = useResource('seats')

  const [inviteEmail, setInviteEmail] = useState('')
  const [newQuantity, setNewQuantity] = useState(1)
  const [isClaimingLoading, setIsClaimingLoading] = useState(false)
  const [isReleasingId, setIsReleasingId] = useState<string | null>(null)
  const [isAdjustingSeats, setIsAdjustingSeats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Issue state
  const [issues, setIssues] = useState<Issue[]>([])
  const [newIssueTitle, setNewIssueTitle] = useState('')

  const previousUserIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const currentUserId = session?.user?.id
    if (
      currentUserId &&
      currentUserId !== previousUserIdRef.current &&
      billing.loaded &&
      billing.reload
    ) {
      previousUserIdRef.current = currentUserId
      billing.reload()
    } else if (currentUserId) {
      previousUserIdRef.current = currentUserId
    }
  }, [session?.user?.id, billing])

  const hasInitializedQuantity = useRef(false)
  useEffect(() => {
    if (seatUsage?.capacity && !hasInitializedQuantity.current) {
      setNewQuantity(seatUsage.capacity)
      hasInitializedQuantity.current = true
    }
  }, [seatUsage?.capacity])

  useEffect(() => {
    if (isSessionPending || !billing.loaded) {
      return
    }

    const hasNonFreePlan =
      billing.currentSubscriptions &&
      billing.currentSubscriptions.length > 0 &&
      billing.currentSubscriptions.some((sub) => !sub.isFreePlan)

    if (!hasNonFreePlan) {
      router.push('/pricing')
    }
  }, [isSessionPending, billing.loaded, billing.currentSubscriptions, router])

  if (isSessionPending || !billing.loaded) {
    return <DashboardSkeleton />
  }

  if (
    billing.loadBilling !== true ||
    billing.errors !== null ||
    !billing.pricingModel
  ) {
    return <DashboardSkeleton />
  }

  const currentSubscription = billing.currentSubscriptions?.[0]
  const planName = currentSubscription?.name || 'Unknown Plan'

  // Issue handlers
  const handleCreateIssue = () => {
    if (!newIssueTitle.trim()) return

    const newIssue: Issue = {
      id: `ISS-${Date.now()}`,
      title: newIssueTitle.trim(),
      done: false,
      createdAt: new Date(),
    }
    setIssues([newIssue, ...issues])
    setNewIssueTitle('')
  }

  const handleToggleIssue = (id: string) => {
    setIssues(
      issues.map((issue) =>
        issue.id === id ? { ...issue, done: !issue.done } : issue
      )
    )
  }

  const handleDeleteIssue = (id: string) => {
    setIssues(issues.filter((issue) => issue.id !== id))
  }

  // Seat handlers
  const handleClaimSeat = async () => {
    if (!inviteEmail.trim()) return

    setIsClaimingLoading(true)
    setError(null)

    try {
      await claim({ externalId: inviteEmail.trim() })
      setInviteEmail('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add team member. Please try again.'
      )
    } finally {
      setIsClaimingLoading(false)
    }
  }

  const handleReleaseSeat = async (externalId: string) => {
    setIsReleasingId(externalId)
    setError(null)

    try {
      await release({ externalId })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to remove team member. Please try again.'
      )
    } finally {
      setIsReleasingId(null)
    }
  }

  const handleAdjustSeats = async () => {
    if (!billing.adjustSubscription) return

    const claimedCount = seatUsage?.claimed ?? 0
    if (newQuantity < claimedCount) {
      setError(
        `Cannot reduce seats below ${claimedCount}. Release some seats first.`
      )
      return
    }

    const sub = billing.currentSubscriptions?.[0]
    const currentPriceId = sub?.priceId
    if (!currentPriceId || !billing.catalog) {
      setError('Unable to determine current subscription plan.')
      return
    }

    let priceSlug: string | null = null
    for (const product of billing.catalog.products) {
      const price = product.prices.find((p) => p.id === currentPriceId)
      if (price?.slug) {
        priceSlug = price.slug
        break
      }
    }

    if (!priceSlug) {
      setError('Unable to find price slug for current subscription.')
      return
    }

    setIsAdjustingSeats(true)
    setError(null)

    try {
      await billing.adjustSubscription({
        priceSlug,
        quantity: newQuantity,
      })
      hasInitializedQuantity.current = false
      await billing.reload()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to adjust seats. Please try again.'
      )
    } finally {
      setIsAdjustingSeats(false)
    }
  }

  const capacity = seatUsage?.capacity ?? 0
  const claimed = seatUsage?.claimed ?? 0
  const available = seatUsage?.available ?? 0
  const progressPercent = capacity > 0 ? (claimed / capacity) * 100 : 0

  const openIssues = issues.filter((i) => !i.done).length
  const completedIssues = issues.filter((i) => i.done).length

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {session?.user?.name ?? 'there'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm py-1 px-3">
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                {planName}
              </Badge>
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1.5" />
                  Manage Plan
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Issues */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issues Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Issues</CardTitle>
                    <CardDescription>
                      {openIssues} open, {completedIssues} completed
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Create Issue */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="What needs to be done?"
                    value={newIssueTitle}
                    onChange={(e) => setNewIssueTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateIssue()
                    }}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleCreateIssue}
                    disabled={!newIssueTitle.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Issue List */}
                {issues.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No issues yet. Create one above to get started.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleIssue(issue.id)}
                            className="shrink-0"
                          >
                            {issue.done ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                            )}
                          </button>
                          <span
                            className={`text-sm truncate ${issue.done ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {issue.title}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIssue(issue.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Team & Billing */}
          <div className="space-y-6">
            {/* Seat Usage */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Team Seats</CardTitle>
                </div>
                <CardDescription>
                  {claimed} of {capacity} seats used
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSeats ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Progress value={progressPercent} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{available} available</span>
                      <span>{Math.round(progressPercent)}% used</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingClaims ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : claims.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No team members yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {claims.map((claimItem: ResourceClaim) => (
                      <div
                        key={claimItem.id}
                        className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {(claimItem.externalId ?? 'A')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {claimItem.externalId ?? 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Added{' '}
                              {new Date(
                                claimItem.claimedAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {claimItem.externalId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleReleaseSeat(claimItem.externalId!)
                            }
                            disabled={isReleasingId === claimItem.externalId}
                          >
                            {isReleasingId === claimItem.externalId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Member */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleClaimSeat()
                      }}
                      disabled={isClaimingLoading || available === 0}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleClaimSeat}
                      disabled={
                        isClaimingLoading ||
                        !inviteEmail.trim() ||
                        available === 0
                      }
                      size="sm"
                    >
                      {isClaimingLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {available === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      No seats available. Add more seats below.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Adjust Seats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Adjust Seats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 p-0"
                      onClick={() =>
                        setNewQuantity(Math.max(claimed, newQuantity - 1))
                      }
                      disabled={newQuantity <= claimed || isAdjustingSeats}
                    >
                      -
                    </Button>
                    <div className="text-center">
                      <span className="text-2xl font-bold">{newQuantity}</span>
                      <p className="text-xs text-muted-foreground">seats</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 p-0"
                      onClick={() =>
                        setNewQuantity(Math.min(100, newQuantity + 1))
                      }
                      disabled={newQuantity >= 100 || isAdjustingSeats}
                    >
                      +
                    </Button>
                  </div>

                  {newQuantity !== capacity && (
                    <p className="text-xs text-center text-muted-foreground">
                      {newQuantity > capacity
                        ? `+${newQuantity - capacity} seats`
                        : `-${capacity - newQuantity} seats`}
                    </p>
                  )}

                  <Button
                    onClick={handleAdjustSeats}
                    disabled={
                      isAdjustingSeats ||
                      newQuantity === capacity ||
                      newQuantity < claimed ||
                      !billing.adjustSubscription
                    }
                    className="w-full"
                    size="sm"
                  >
                    {isAdjustingSeats ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Updating...
                      </>
                    ) : newQuantity === capacity ? (
                      'No Changes'
                    ) : (
                      'Update Seats'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="py-3">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
