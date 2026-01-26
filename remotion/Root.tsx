import React from "react";
import { Composition } from "remotion";
import { ProAgilityAnimation } from "./agility/compositions/ProAgilityAnimation";
import { TTestAnimation } from "./agility/compositions/TTestAnimation";
import { IllinoisAgilityAnimation } from "./agility/compositions/IllinoisAgilityAnimation";
import { BoxDrillAnimation } from "./agility/compositions/BoxDrillAnimation";
import { LDrillAnimation } from "./agility/compositions/LDrillAnimation";
import { SprintAnimation } from "./agility/compositions/SprintAnimation";
import { ArrowheadAnimation } from "./agility/compositions/ArrowheadAnimation";
import { WDrillAnimation } from "./agility/compositions/WDrillAnimation";
import { StarDrillAnimation } from "./agility/compositions/StarDrillAnimation";
import { ConeZigZagAnimation } from "./agility/compositions/ConeZigZagAnimation";
import { LadderDrillAnimation } from "./agility/compositions/LadderDrillAnimation";

// Type helper to cast animation components for Remotion Composition
type AnyComponent = React.ComponentType<Record<string, unknown>>;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 5-10-5 Pro Agility */}
      <Composition
        id="ProAgility"
        component={ProAgilityAnimation as unknown as AnyComponent}
        durationInFrames={360}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          athleteTime: 4.5,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* T-Test */}
      <Composition
        id="TTest"
        component={TTestAnimation as unknown as AnyComponent}
        durationInFrames={420}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          athleteTime: 9.5,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* Illinois Agility Test */}
      <Composition
        id="IllinoisAgility"
        component={IllinoisAgilityAnimation as unknown as AnyComponent}
        durationInFrames={400}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          athleteTime: 15.2,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* Box Drill */}
      <Composition
        id="BoxDrill"
        component={BoxDrillAnimation as unknown as AnyComponent}
        durationInFrames={300}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          athleteTime: 8.0,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* L-Drill (3 Cone Drill) */}
      <Composition
        id="LDrill"
        component={LDrillAnimation as unknown as AnyComponent}
        durationInFrames={400}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          athleteTime: 7.0,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* 10m Sprint */}
      <Composition
        id="Sprint10m"
        component={SprintAnimation as unknown as AnyComponent}
        durationInFrames={200}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          distance: 10 as const,
          athleteTime: 1.8,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* 20m Sprint */}
      <Composition
        id="Sprint20m"
        component={SprintAnimation as unknown as AnyComponent}
        durationInFrames={240}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          distance: 20 as const,
          athleteTime: 3.0,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* 40m Sprint */}
      <Composition
        id="Sprint40m"
        component={SprintAnimation as unknown as AnyComponent}
        durationInFrames={300}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          distance: 40 as const,
          athleteTime: 5.2,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* Arrowhead Agility Test */}
      <Composition
        id="Arrowhead"
        component={ArrowheadAnimation as unknown as AnyComponent}
        durationInFrames={300}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          athleteTime: 8.5,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* W-Drill */}
      <Composition
        id="WDrill"
        component={WDrillAnimation as unknown as AnyComponent}
        durationInFrames={310}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          athleteTime: 7.5,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* Star Drill */}
      <Composition
        id="StarDrill"
        component={StarDrillAnimation as unknown as AnyComponent}
        durationInFrames={350}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          athleteTime: 12.0,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* Cone Zig-Zag */}
      <Composition
        id="ConeZigZag"
        component={ConeZigZagAnimation as unknown as AnyComponent}
        durationInFrames={330}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          athleteTime: 8.0,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* Ladder - Icky Shuffle */}
      <Composition
        id="LadderIckyShuffle"
        component={LadderDrillAnimation as unknown as AnyComponent}
        durationInFrames={285}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          drillType: "icky-shuffle" as const,
          athleteTime: 5.0,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* Ladder - Lateral Shuffle */}
      <Composition
        id="LadderLateralShuffle"
        component={LadderDrillAnimation as unknown as AnyComponent}
        durationInFrames={285}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          drillType: "lateral-shuffle" as const,
          athleteTime: 6.0,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* Ladder - High Knees */}
      <Composition
        id="LadderHighKnees"
        component={LadderDrillAnimation as unknown as AnyComponent}
        durationInFrames={285}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          drillType: "high-knees" as const,
          athleteTime: 4.5,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />

      {/* Ladder - In-Out */}
      <Composition
        id="LadderInOut"
        component={LadderDrillAnimation as unknown as AnyComponent}
        durationInFrames={285}
        fps={30}
        width={800}
        height={400}
        defaultProps={{
          drillType: "in-out" as const,
          athleteTime: 5.5,
          benchmarkTier: "average" as const,
          locale: "sv" as const,
        }}
      />
    </>
  );
};
