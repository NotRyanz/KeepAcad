import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import Animated, { useAnimatedStyle, withTiming, Easing, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type FocusStatus = 'setup' | 'running' | 'paused' | 'finished';

interface BackgroundMediaProps {
  uri: string;
  type: 'video' | 'audio';
  muted: boolean;
  status: FocusStatus;
  videoFit?: 'cover' | 'contain';
}

function fadeVolume(player: any, targetVolume: number, duration: number = 1000) {
  if (!player) return;
  const steps = 20;
  const stepTime = duration / steps;
  let startVolume = 1.0;
  try { startVolume = player.volume; } catch(e) {}
  const diff = targetVolume - startVolume;
  let currentStep = 0;
  
  const interval = setInterval(() => {
    currentStep++;
    try {
      player.volume = startVolume + (diff * (currentStep / steps));
    } catch(e) {}
    if (currentStep >= steps) {
      clearInterval(interval);
      try { player.volume = targetVolume; } catch(e) {}
    }
  }, stepTime);
}

export default function BackgroundMedia({ uri, type, muted, status, videoFit = 'cover' }: BackgroundMediaProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (status === 'running') {
      opacity.value = withTiming(0.4, { duration: 1000, easing: Easing.out(Easing.ease) });
    } else {
      opacity.value = withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) });
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (type === 'video') {
    return <VideoBackground uri={uri} muted={muted} status={status} animatedStyle={animatedStyle} videoFit={videoFit} />;
  }
  return <AudioBackground uri={uri} muted={muted} status={status} />;
}

function VideoBackground({ uri, muted, status, animatedStyle, videoFit }: any) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (!player) return;
    if (status === 'running') {
      player.play();
      if (!muted) fadeVolume(player, 1.0);
    } else {
      if (!muted) {
        fadeVolume(player, 0, 1000);
      }
    }
  }, [status, player, muted]);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const transformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle, { zIndex: 0, width: '100%', height: '100%' }]}>
        <Animated.View style={[StyleSheet.absoluteFill, transformStyle, { width: '100%', height: '100%' }]}>
          <VideoView player={player} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} contentFit={videoFit} nativeControls={false} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function AudioBackground({ uri, muted, status }: any) {
  const player = useAudioPlayer(uri);

  useEffect(() => {
    if (!player) return;
    player.loop = true;
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (!player) return;
    if (status === 'running') {
      player.play();
      if (!muted) fadeVolume(player, 1.0);
    } else {
      if (!muted) {
        fadeVolume(player, 0, 1000);
      }
    }
  }, [status, player, muted]);

  return null;
}
