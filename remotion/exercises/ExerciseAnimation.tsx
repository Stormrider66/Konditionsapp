
import { AbsoluteFill, Img, useVideoConfig, useCurrentFrame, interpolate, Easing } from "remotion";
import React, { useMemo } from "react";

interface ExerciseAnimationProps {
    imageUrls: string[];
}

export const ExerciseAnimation: React.FC<ExerciseAnimationProps> = ({ imageUrls }) => {
    const { fps, durationInFrames } = useVideoConfig();
    const frame = useCurrentFrame();

    // Configuration
    const imageDuration = 45; // Frames per image
    const transitionDuration = 15; // Frames for transition

    if (!imageUrls || imageUrls.length === 0) {
        return (
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' }}>
                <h1 style={{ color: 'white' }}>No Images</h1>
            </AbsoluteFill>
        );
    }

    // Calculate which image to show
    // We cycle through them
    const totalCircleDuration = imageUrls.length * imageDuration;

    // Create a cyclic index nicely
    const cycleFrame = frame % totalCircleDuration;
    const activeIndex = Math.floor(cycleFrame / imageDuration);
    const nextIndex = (activeIndex + 1) % imageUrls.length;

    // Local frame within the current image's timeslot
    const localFrame = cycleFrame % imageDuration;

    // Fade logic
    // We want to fade OUT the current image and fade IN the next image during the last 'transitionDuration' frames

    const opacity = interpolate(
        localFrame,
        [imageDuration - transitionDuration, imageDuration],
        [1, 0],
        { extrapolateRight: "clamp" }
    );

    const nextOpacity = interpolate(
        localFrame,
        [imageDuration - transitionDuration, imageDuration],
        [0, 1],
        { extrapolateRight: "clamp" }
    );

    // Scale effect for breathing room
    const scale = interpolate(
        localFrame,
        [0, imageDuration],
        [1, 1.05], // Subtle zoom in
        { easing: Easing.bezier(0.25, 1, 0.5, 1) }
    );


    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            {/* Background (blurred version of current image for ambiance) */}
            <AbsoluteFill style={{ overflow: 'hidden' }}>
                <Img
                    src={imageUrls[activeIndex]}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(20px) brightness(0.3)',
                        transform: `scale(1.2)`
                    }}
                />
            </AbsoluteFill>

            {/* Main Image Container */}
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>

                {/* Current Image */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: opacity
                }}>
                    <Img
                        src={imageUrls[activeIndex]}
                        style={{
                            height: '100%',
                            width: '100%',
                            objectFit: 'contain',
                            transform: `scale(${scale})`
                        }}
                    />
                </div>

                {/* Next Image (fading in) */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: nextOpacity
                }}>
                    <Img
                        src={imageUrls[nextIndex]}
                        style={{
                            height: '100%',
                            width: '100%',
                            objectFit: 'contain',
                            transform: `scale(1)` // Starts at normal scale
                        }}
                    />
                </div>
            </AbsoluteFill>

            {/* Progress Bar (Optional, for visual timing) */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                left: '10%',
                width: '80%',
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 2
            }}>
                <div style={{
                    width: `${((activeIndex + (localFrame / imageDuration)) / imageUrls.length) * 100}%`,
                    height: '100%',
                    backgroundColor: '#ff4400', // Our theme orange
                    borderRadius: 2,
                    boxShadow: '0 0 10px #ff4400'
                }} />
            </div>

        </AbsoluteFill>
    );
};
