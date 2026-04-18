'use client'

import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { HyroxRaceTimeAnalysis } from '../HyroxRaceTimeAnalysis'
import { HyroxAthleteProfileCard } from '../HyroxAthleteProfileCard'
import type { ConfigFormData } from './schema'

// Avoid unused import error under TypeScript. `Form` is re-exported here
// so callers that lazy-import the block keep a stable surface.
void Form

interface HyroxStationTimesProps {
  form: UseFormReturn<ConfigFormData>
  watchRaceDistance: ConfigFormData['recentRaceDistance']
}

export function HyroxStationTimes({ form, watchRaceDistance }: HyroxStationTimesProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg p-4 mt-6">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
          <div className="text-left">
            <h3 className="font-medium">HYROX Stationstider</h3>
            <p className="text-sm text-muted-foreground">Ange dina nuvarande stationstider för analys</p>
          </div>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="hyroxDivision"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Division</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj division" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="doubles">Doubles</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hyroxGender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kön (för benchmarks)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj kön" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Man</SelectItem>
                    <SelectItem value="female">Kvinna</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hyroxBodyweight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kroppsvikt (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="t.ex. 80"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? undefined : parseFloat(val))
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 text-sm">Stationstider (MM:SS)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="hyroxStationTimes.skierg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">SkiErg 1km</FormLabel>
                  <FormControl>
                    <Input placeholder="3:45" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hyroxStationTimes.sledPush"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Sled Push 50m</FormLabel>
                  <FormControl>
                    <Input placeholder="2:30" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hyroxStationTimes.sledPull"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Sled Pull 50m</FormLabel>
                  <FormControl>
                    <Input placeholder="3:00" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hyroxStationTimes.burpeeBroadJump"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Burpee BJ 80m</FormLabel>
                  <FormControl>
                    <Input placeholder="2:40" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hyroxStationTimes.rowing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Rowing 1km</FormLabel>
                  <FormControl>
                    <Input placeholder="3:45" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hyroxStationTimes.farmersCarry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Farmers 200m</FormLabel>
                  <FormControl>
                    <Input placeholder="1:30" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hyroxStationTimes.sandbagLunge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Lunge 100m</FormLabel>
                  <FormControl>
                    <Input placeholder="3:00" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hyroxStationTimes.wallBalls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Wall Balls</FormLabel>
                  <FormControl>
                    <Input placeholder="3:30" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4">
            <FormField
              control={form.control}
              name="hyroxStationTimes.averageRunPace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Genomsnittligt löptempo (min/km)</FormLabel>
                  <FormControl>
                    <Input placeholder="4:30" className="max-w-[150px]" {...field} />
                  </FormControl>
                  <FormDescription>Tempo för 1km-avsnitten mellan stationer</FormDescription>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Stationstider används för att identifiera svagheter och prioritera träningen.
            Sled Pull och Wall Balls är vanliga &quot;time sinks&quot; för nybörjare.
          </AlertDescription>
        </Alert>

        <HyroxRaceTimeAnalysis
          stationTimes={{
            skierg: form.watch('hyroxStationTimes.skierg'),
            sledPush: form.watch('hyroxStationTimes.sledPush'),
            sledPull: form.watch('hyroxStationTimes.sledPull'),
            burpeeBroadJump: form.watch('hyroxStationTimes.burpeeBroadJump'),
            rowing: form.watch('hyroxStationTimes.rowing'),
            farmersCarry: form.watch('hyroxStationTimes.farmersCarry'),
            sandbagLunge: form.watch('hyroxStationTimes.sandbagLunge'),
            wallBalls: form.watch('hyroxStationTimes.wallBalls'),
            averageRunPace: form.watch('hyroxStationTimes.averageRunPace'),
          }}
          gender={form.watch('hyroxGender')}
          targetTime={form.watch('targetTime')}
        />

        <HyroxAthleteProfileCard
          recentRaceDistance={watchRaceDistance as '5K' | '10K' | 'HALF' | 'MARATHON' | undefined}
          recentRaceTime={form.watch('recentRaceTime')}
          hyroxAverageRunPace={form.watch('hyroxStationTimes.averageRunPace')}
          stationTimes={{
            skierg: form.watch('hyroxStationTimes.skierg'),
            sledPush: form.watch('hyroxStationTimes.sledPush'),
            sledPull: form.watch('hyroxStationTimes.sledPull'),
            burpeeBroadJump: form.watch('hyroxStationTimes.burpeeBroadJump'),
            rowing: form.watch('hyroxStationTimes.rowing'),
            farmersCarry: form.watch('hyroxStationTimes.farmersCarry'),
            sandbagLunge: form.watch('hyroxStationTimes.sandbagLunge'),
            wallBalls: form.watch('hyroxStationTimes.wallBalls'),
          }}
          gender={form.watch('hyroxGender')}
          experienceLevel={form.watch('experienceLevel')}
          currentWeeklyKm={form.watch('currentWeeklyVolume')}
          goalTime={form.watch('targetTime')}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}
