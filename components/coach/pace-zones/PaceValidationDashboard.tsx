'use client'

// components/coach/pace-zones/PaceValidationDashboard.tsx
// Comprehensive dashboard displaying all calculated training zones

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Info, RefreshCw, TrendingUp } from 'lucide-react'

interface PaceValidationDashboardProps {
  clientId: string
  clientName: string
}

export function PaceValidationDashboard({ clientId, clientName }: PaceValidationDashboardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paceData, setPaceData] = useState<any>(null)

  const fetchPaceData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/clients/${clientId}/paces`)

      if (!response.ok) {
        throw new Error('Failed to fetch pace data')
      }

      const data = await response.json()
      setPaceData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchPaceData()
    setIsRefreshing(false)
  }

  useEffect(() => {
    fetchPaceData()
  }, [fetchPaceData])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Calculating training zones...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !paceData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || 'Failed to load pace data'}</AlertDescription>
      </Alert>
    )
  }

  const {
    marathonPace,
    thresholdPace,
    easyPace,
    intervalPace,
    repetitionPace,
    zones,
    primarySource,
    secondarySource,
    confidence,
    athleteClassification,
    vdotResult,
    lactateProfile,
    validationResults,
    warnings,
    errors,
  } = paceData

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Training Zones - {clientName}</h2>
          <p className="text-sm text-muted-foreground">
            Primary Source: <Badge variant="outline">{primarySource}</Badge>
            {secondarySource && (
              <span className="ml-2">
                Secondary: <Badge variant="outline">{secondarySource}</Badge>
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Zones
        </Button>
      </div>

      {/* Errors */}
      {errors && errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errors Detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((err: string, idx: number) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning: string, idx: number) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Athlete Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Athlete Classification</CardTitle>
          <CardDescription>Training level and metabolic profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-2xl font-bold">
                <Badge variant={
                  athleteClassification.level === 'ELITE' ? 'default' :
                  athleteClassification.level === 'ADVANCED' ? 'secondary' :
                  'outline'
                }>
                  {athleteClassification.level}
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Metabolic Type</p>
              <p className="text-lg font-semibold">{athleteClassification.metabolicType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Compression Factor</p>
              <p className="text-lg font-semibold">
                {(athleteClassification.compressionFactor * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                MP = {(athleteClassification.compressionFactor * 100).toFixed(0)}% of LT2
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confidence</p>
              <Badge variant={
                confidence === 'VERY_HIGH' ? 'default' :
                confidence === 'HIGH' ? 'secondary' :
                confidence === 'MEDIUM' ? 'outline' :
                'destructive'
              }>
                {confidence}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VDOT Analysis */}
      {vdotResult && (
        <Card>
          <CardHeader>
            <CardTitle>VDOT Analysis</CardTitle>
            <CardDescription>Jack Daniels Running Calculator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">VDOT</p>
                <p className="text-3xl font-bold">{vdotResult.vdot}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Race Age</p>
                <p className="text-lg font-semibold">{vdotResult.ageInDays} days</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <Badge variant={
                  vdotResult.confidence === 'VERY_HIGH' ? 'default' :
                  vdotResult.confidence === 'HIGH' ? 'secondary' :
                  'outline'
                }>
                  {vdotResult.confidence}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age Adjusted</p>
                <p className="text-lg">{vdotResult.adjustments.ageAdjusted ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender Adjusted</p>
                <p className="text-lg">{vdotResult.adjustments.genderAdjusted ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {vdotResult.adjustments.originalVDOT && (
              <p className="text-sm text-muted-foreground mt-4">
                Original VDOT: {vdotResult.adjustments.originalVDOT} (before adjustments)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lactate Profile */}
      {lactateProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Lactate Profile</CardTitle>
            <CardDescription>Individual ratio method - LT2 as % of max lactate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Max Lactate</p>
                <p className="text-2xl font-bold">{lactateProfile.maxLactate.toFixed(1)} mmol/L</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LT2 Lactate</p>
                <p className="text-2xl font-bold">{lactateProfile.lt2.lactate.toFixed(1)} mmol/L</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LT2 Ratio</p>
                <p className="text-2xl font-bold">{(lactateProfile.lt2Ratio * 100).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">of max lactate</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LT2 Speed</p>
                <p className="text-xl font-semibold">{lactateProfile.lt2.speed.toFixed(1)} km/h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LT2 HR</p>
                <p className="text-xl font-semibold">{lactateProfile.lt2.heartRate} bpm</p>
              </div>
            </div>

            {lactateProfile.dmaxResult && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold">D-max Analysis</p>
                <div className="grid grid-cols-4 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">R² (Fit Quality)</p>
                    <p className="text-lg font-semibold">{lactateProfile.dmaxResult.rSquared.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">D-max Speed</p>
                    <p className="text-lg font-semibold">{lactateProfile.dmaxResult.intensity.toFixed(1)} km/h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">D-max Lactate</p>
                    <p className="text-lg font-semibold">{lactateProfile.dmaxResult.lactate.toFixed(1)} mmol/L</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Method</p>
                    <Badge>{lactateProfile.method}</Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Core Paces Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Core Training Paces</CardTitle>
          <CardDescription>Key paces for program generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Easy</p>
              <p className="text-lg font-semibold">{easyPace.minPace}</p>
              <p className="text-lg font-semibold">- {easyPace.maxPace}</p>
              <p className="text-xs text-muted-foreground">
                {easyPace.minKmh.toFixed(1)}-{easyPace.maxKmh.toFixed(1)} km/h
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Marathon</p>
              <p className="text-2xl font-bold">{marathonPace.pace}</p>
              <p className="text-xs text-muted-foreground">{marathonPace.kmh.toFixed(1)} km/h</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Threshold</p>
              <p className="text-2xl font-bold">{thresholdPace.pace}</p>
              <p className="text-xs text-muted-foreground">{thresholdPace.kmh.toFixed(1)} km/h</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Interval</p>
              <p className="text-lg font-semibold">{intervalPace.pace}</p>
              <p className="text-xs text-muted-foreground">{intervalPace.kmh.toFixed(1)} km/h</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Repetition</p>
              <p className="text-lg font-semibold">{repetitionPace.pace}</p>
              <p className="text-xs text-muted-foreground">{repetitionPace.kmh.toFixed(1)} km/h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone Systems Tabs */}
      <Tabs defaultValue="daniels" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daniels">Daniels (5 Zones)</TabsTrigger>
          <TabsTrigger value="canova">Canova (7 Zones)</TabsTrigger>
          <TabsTrigger value="norwegian">Norwegian (3 Zones)</TabsTrigger>
          <TabsTrigger value="hr">Heart Rate (5 Zones)</TabsTrigger>
        </TabsList>

        {/* Daniels Zones */}
        <TabsContent value="daniels">
          <Card>
            <CardHeader>
              <CardTitle>Jack Daniels Training Zones</CardTitle>
              <CardDescription>E = Easy, M = Marathon, T = Threshold, I = Interval, R = Repetition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ZoneRow
                  zone="E (Easy)"
                  pace={`${zones.daniels.easy.minPace} - ${zones.daniels.easy.maxPace}`}
                  speed={`${zones.daniels.easy.minKmh.toFixed(1)} - ${zones.daniels.easy.maxKmh.toFixed(1)} km/h`}
                  hr={zones.daniels.easy.hrMin && zones.daniels.easy.hrMax ? `${zones.daniels.easy.hrMin}-${zones.daniels.easy.hrMax} bpm` : undefined}
                  color="bg-green-100 dark:bg-green-900"
                />
                <ZoneRow
                  zone="M (Marathon)"
                  pace={zones.daniels.marathon.pace}
                  speed={`${zones.daniels.marathon.kmh.toFixed(1)} km/h`}
                  hr={zones.daniels.marathon.hr ? `${zones.daniels.marathon.hr} bpm` : undefined}
                  color="bg-blue-100 dark:bg-blue-900"
                />
                <ZoneRow
                  zone="T (Threshold)"
                  pace={zones.daniels.threshold.pace}
                  speed={`${zones.daniels.threshold.kmh.toFixed(1)} km/h`}
                  hr={zones.daniels.threshold.hr ? `${zones.daniels.threshold.hr} bpm` : undefined}
                  color="bg-yellow-100 dark:bg-yellow-900"
                />
                <ZoneRow
                  zone="I (Interval)"
                  pace={zones.daniels.interval.pace}
                  speed={`${zones.daniels.interval.kmh.toFixed(1)} km/h`}
                  hr={zones.daniels.interval.hr ? `${zones.daniels.interval.hr} bpm` : undefined}
                  color="bg-orange-100 dark:bg-orange-900"
                />
                <ZoneRow
                  zone="R (Repetition)"
                  pace={zones.daniels.repetition.pace}
                  speed={`${zones.daniels.repetition.kmh.toFixed(1)} km/h`}
                  hr={zones.daniels.repetition.hr ? `${zones.daniels.repetition.hr} bpm` : undefined}
                  color="bg-red-100 dark:bg-red-900"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Canova Zones */}
        <TabsContent value="canova">
          <Card>
            <CardHeader>
              <CardTitle>Canova Training Zones</CardTitle>
              <CardDescription>Marathon-centric training system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ZoneRow
                  zone="Fundamental"
                  pace={zones.canova.fundamental.pace}
                  speed={`${zones.canova.fundamental.kmh.toFixed(1)} km/h`}
                  extra={`${zones.canova.fundamental.percentOfMP}% of MP`}
                  color="bg-green-100 dark:bg-green-900"
                />
                <ZoneRow
                  zone="Progressive"
                  pace={`${zones.canova.progressive.minPace} - ${zones.canova.progressive.maxPace}`}
                  speed={`${zones.canova.progressive.minKmh.toFixed(1)} - ${zones.canova.progressive.maxKmh.toFixed(1)} km/h`}
                  extra={`${zones.canova.progressive.percentOfMP} of MP`}
                  color="bg-blue-100 dark:bg-blue-900"
                />
                <ZoneRow
                  zone="Marathon Pace"
                  pace={zones.canova.marathon.pace}
                  speed={`${zones.canova.marathon.kmh.toFixed(1)} km/h`}
                  extra={`${zones.canova.marathon.percentOfMP}% of MP`}
                  color="bg-cyan-100 dark:bg-cyan-900"
                />
                <ZoneRow
                  zone="Specific"
                  pace={zones.canova.specific.pace}
                  speed={`${zones.canova.specific.kmh.toFixed(1)} km/h`}
                  extra={`${zones.canova.specific.percentOfMP}% of MP`}
                  color="bg-yellow-100 dark:bg-yellow-900"
                />
                <ZoneRow
                  zone="Threshold"
                  pace={zones.canova.threshold.pace}
                  speed={`${zones.canova.threshold.kmh.toFixed(1)} km/h`}
                  extra={`${zones.canova.threshold.percentOfMP}% of MP`}
                  color="bg-orange-100 dark:bg-orange-900"
                />
                <ZoneRow
                  zone="5K Pace"
                  pace={zones.canova.fiveK.pace}
                  speed={`${zones.canova.fiveK.kmh.toFixed(1)} km/h`}
                  extra={`${zones.canova.fiveK.percentOfMP}% of MP`}
                  color="bg-red-100 dark:bg-red-900"
                />
                <ZoneRow
                  zone="1K Pace"
                  pace={zones.canova.oneK.pace}
                  speed={`${zones.canova.oneK.kmh.toFixed(1)} km/h`}
                  extra={`${zones.canova.oneK.percentOfMP}% of MP`}
                  color="bg-purple-100 dark:bg-purple-900"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Norwegian Zones */}
        <TabsContent value="norwegian">
          <Card>
            <CardHeader>
              <CardTitle>Norwegian Method Zones</CardTitle>
              <CardDescription>Polarized training with double threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ZoneRow
                  zone="Green Zone"
                  pace={`${zones.norwegian.green.minPace} - ${zones.norwegian.green.maxPace}`}
                  speed={`${zones.norwegian.green.minKmh.toFixed(1)} - ${zones.norwegian.green.maxKmh.toFixed(1)} km/h`}
                  extra={zones.norwegian.green.lactate}
                  color="bg-green-100 dark:bg-green-900"
                />
                <ZoneRow
                  zone="Threshold Zone"
                  pace={zones.norwegian.threshold.pace}
                  speed={`${zones.norwegian.threshold.kmh.toFixed(1)} km/h`}
                  extra={zones.norwegian.threshold.lactate}
                  color="bg-yellow-100 dark:bg-yellow-900"
                />
                <ZoneRow
                  zone="Red Zone"
                  pace={`${zones.norwegian.red.minPace} - ${zones.norwegian.red.maxPace}`}
                  speed={`${zones.norwegian.red.minKmh.toFixed(1)} - ${zones.norwegian.red.maxKmh.toFixed(1)} km/h`}
                  extra={zones.norwegian.red.lactate}
                  color="bg-red-100 dark:bg-red-900"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HR Zones */}
        <TabsContent value="hr">
          <Card>
            <CardHeader>
              <CardTitle>Heart Rate Zones</CardTitle>
              <CardDescription>5-zone system based on % of max HR</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ZoneRow
                  zone="Zone 1"
                  pace={zones.hrBased.zone1.description}
                  speed={`${zones.hrBased.zone1.minHR}-${zones.hrBased.zone1.maxHR} bpm`}
                  extra="50-60% max HR"
                  color="bg-green-100 dark:bg-green-900"
                />
                <ZoneRow
                  zone="Zone 2"
                  pace={zones.hrBased.zone2.description}
                  speed={`${zones.hrBased.zone2.minHR}-${zones.hrBased.zone2.maxHR} bpm`}
                  extra="60-70% max HR"
                  color="bg-blue-100 dark:bg-blue-900"
                />
                <ZoneRow
                  zone="Zone 3"
                  pace={zones.hrBased.zone3.description}
                  speed={`${zones.hrBased.zone3.minHR}-${zones.hrBased.zone3.maxHR} bpm`}
                  extra="70-80% max HR"
                  color="bg-yellow-100 dark:bg-yellow-900"
                />
                <ZoneRow
                  zone="Zone 4"
                  pace={zones.hrBased.zone4.description}
                  speed={`${zones.hrBased.zone4.minHR}-${zones.hrBased.zone4.maxHR} bpm`}
                  extra="80-90% max HR"
                  color="bg-orange-100 dark:bg-orange-900"
                />
                <ZoneRow
                  zone="Zone 5"
                  pace={zones.hrBased.zone5.description}
                  speed={`${zones.hrBased.zone5.minHR}-${zones.hrBased.zone5.maxHR} bpm`}
                  extra="90-100% max HR"
                  color="bg-red-100 dark:bg-red-900"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Validation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Data Validation</CardTitle>
          <CardDescription>Source availability and consistency checks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Data Sources Available</p>
              <div className="flex gap-2">
                <ValidationBadge
                  label="VDOT (Race)"
                  available={validationResults.sourcesAvailable.vdot}
                />
                <ValidationBadge
                  label="Lactate Test"
                  available={validationResults.sourcesAvailable.lactate}
                />
                <ValidationBadge
                  label="HR Data"
                  available={validationResults.sourcesAvailable.hrData}
                />
                <ValidationBadge
                  label="Profile"
                  available={validationResults.sourcesAvailable.profile}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Consistency Checks</p>
              <div className="space-y-2">
                <ConsistencyCheck
                  label="Marathon Pace"
                  consistent={validationResults.consistencyChecks.marathonPaceConsistent}
                />
                <ConsistencyCheck
                  label="Threshold Pace"
                  consistent={validationResults.consistencyChecks.thresholdPaceConsistent}
                />
                {validationResults.consistencyChecks.mismatchPercent !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Mismatch between sources: {validationResults.consistencyChecks.mismatchPercent.toFixed(1)}%
                  </p>
                )}
              </div>
            </div>

            {validationResults.dataQuality && (
              <div>
                <p className="text-sm font-semibold mb-2">Data Quality</p>
                <div className="grid grid-cols-3 gap-4">
                  {validationResults.dataQuality.vdotConfidence && (
                    <div>
                      <p className="text-xs text-muted-foreground">VDOT Confidence</p>
                      <Badge variant="outline">{validationResults.dataQuality.vdotConfidence}</Badge>
                    </div>
                  )}
                  {validationResults.dataQuality.lactateConfidence && (
                    <div>
                      <p className="text-xs text-muted-foreground">Lactate Confidence</p>
                      <Badge variant="outline">{validationResults.dataQuality.lactateConfidence}</Badge>
                    </div>
                  )}
                  {validationResults.dataQuality.dmaxRSquared !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground">D-max R²</p>
                      <Badge variant="outline">{validationResults.dataQuality.dmaxRSquared.toFixed(3)}</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Recommendations */}
      {athleteClassification.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle>Training Recommendations</CardTitle>
            <CardDescription>Based on metabolic profile and athlete level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Interval Type</p>
                <p className="text-lg font-semibold">{athleteClassification.recommendations.intervalType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recovery Days</p>
                <p className="text-lg font-semibold">{athleteClassification.recommendations.recoveryDays} per week</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taper Length</p>
                <p className="text-lg font-semibold">{athleteClassification.recommendations.taperLength} weeks</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volume Tolerance</p>
                <p className="text-lg font-semibold">{athleteClassification.recommendations.volumeTolerance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper component for zone rows
function ZoneRow({ zone, pace, speed, hr, extra, color }: {
  zone: string
  pace: string
  speed: string
  hr?: string
  extra?: string
  color: string
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${color}`}>
      <div className="flex-1">
        <p className="font-semibold">{zone}</p>
      </div>
      <div className="flex-1 text-center">
        <p className="font-mono text-lg">{pace}</p>
      </div>
      <div className="flex-1 text-center">
        <p className="text-sm text-muted-foreground">{speed}</p>
      </div>
      {hr && (
        <div className="flex-1 text-center">
          <p className="text-sm text-muted-foreground">{hr}</p>
        </div>
      )}
      {extra && (
        <div className="flex-1 text-right">
          <p className="text-xs text-muted-foreground">{extra}</p>
        </div>
      )}
    </div>
  )
}

// Helper component for validation badges
function ValidationBadge({ label, available }: { label: string; available: boolean }) {
  return (
    <Badge variant={available ? 'default' : 'outline'}>
      {available ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  )
}

// Helper component for consistency checks
function ConsistencyCheck({ label, consistent }: { label: string; consistent: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {consistent ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircle className="h-4 w-4 text-yellow-600" />
      )}
      <span className="text-sm">{label}</span>
      <Badge variant={consistent ? 'default' : 'outline'}>
        {consistent ? 'Consistent' : 'Mismatch'}
      </Badge>
    </div>
  )
}
