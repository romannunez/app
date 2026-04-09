/**
 * VideoPlayer — Instagram Reels-style video playback
 *
 * Native (iOS/Android): expo-av Video component (Expo Go compatible)
 *   • Autoplay when visible, pause when out of view
 *   • Sound ON by default
 *   • Full video playback (no forced loop)
 *   • resizeMode="cover"
 *   • Poster image shown while loading (no black flash)
 *   • iOS silent-mode audio enabled
 *
 * Web: HTML5 <video> fallback with same behaviour
 */
import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import {
  Platform,
  View,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── expo-av (native only, Expo Go compatible) ───
let AVVideo: any = null;
let AVAudio: any = null;
if (Platform.OS !== "web") {
  try {
    const expoAV = require("expo-av");
    AVVideo = expoAV.Video;
    AVAudio = expoAV.Audio;
  } catch {}
}

export interface VideoPlayerProps {
  /** require() asset id, { uri: string }, or string URI */
  source: any;
  style?: any;
  /** true → play, false → pause & reset to start */
  shouldPlay?: boolean;
  isLooping?: boolean;
  /** Controlled mute state — managed by parent */
  isMuted?: boolean;
  /** Called when user taps the video to toggle mute */
  onToggleMute?: () => void;
  /** Image shown instantly while video loads */
  posterUri?: string;
  /** Position of the mute/volume button */
  muteButtonPosition?: "top-left" | "bottom-right";
}

// ═══════════════════════════════════════════
// NATIVE COMPONENT — expo-av Video
// ═══════════════════════════════════════════
let audioModeConfigured = false;

function NativeVideoPlayer({
  source,
  style,
  shouldPlay = false,
  isLooping = false,
  isMuted = false,
  onToggleMute,
  posterUri,
  muteButtonPosition = "top-left",
}: VideoPlayerProps) {
  const videoRef = useRef<any>(null);
  const [showPoster, setShowPoster] = useState(true);

  // Resolve source: require() → number, { uri } → keep, string → wrap
  const videoSource =
    typeof source === "number"
      ? source
      : typeof source === "object" && "uri" in source
      ? source
      : typeof source === "string"
      ? { uri: source }
      : source;

  // ─── Enable audio in iOS silent mode (once) ───
  useEffect(() => {
    if (!audioModeConfigured && AVAudio) {
      audioModeConfigured = true;
      AVAudio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      }).catch(() => {});
    }
  }, []);

  // ─── Play / Pause based on visibility ───
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (shouldPlay) {
      // Set volume/mute BEFORE playing so first frame has correct audio
      v.setStatusAsync({
        shouldPlay: true,
        isMuted,
        volume: 1.0,
        rate: 1.0,
        isLooping,
      }).catch(() => {});
    } else {
      v.setStatusAsync({
        shouldPlay: false,
        positionMillis: 0,
      }).catch(() => {});
    }
  }, [shouldPlay]);

  // ─── Sync mute state live ───
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !shouldPlay) return;
    v.setStatusAsync({ isMuted }).catch(() => {});
  }, [isMuted]);

  // ─── Hide poster as soon as video renders its first frame ───
  const handleReadyForDisplay = useCallback(() => {
    setShowPoster(false);
  }, []);

  // Fallback: hide poster after a short delay if onReadyForDisplay doesn't fire
  useEffect(() => {
    if (shouldPlay && showPoster) {
      const timer = setTimeout(() => setShowPoster(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldPlay, showPoster]);

  // Also detect playback start via status update
  const handlePlaybackStatus = useCallback((status: any) => {
    if (status?.isPlaying && showPoster) {
      setShowPoster(false);
    }
  }, [showPoster]);

  const mutePositionStyle =
    muteButtonPosition === "top-left"
      ? localStyles.muteIconTopLeft
      : localStyles.muteIconBottomRight;

  // ─── Fallback: expo-av not available ───
  if (!AVVideo) {
    return (
      <View style={style}>
        {posterUri && (
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={onToggleMute}>
      <View style={style}>
        {/* Poster shown until first frame renders — avoids black flash */}
        {showPoster && posterUri && (
          <Image
            source={{ uri: posterUri }}
            style={[StyleSheet.absoluteFill, { zIndex: 2 }]}
            resizeMode="cover"
          />
        )}

        <AVVideo
          ref={videoRef}
          source={videoSource}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          shouldPlay={shouldPlay}
          isLooping={isLooping}
          isMuted={isMuted}
          volume={1.0}
          rate={1.0}
          useNativeControls={false}
          usePoster={false}
          onReadyForDisplay={handleReadyForDisplay}
          onPlaybackStatusUpdate={handlePlaybackStatus}
          progressUpdateIntervalMillis={500}
        />

        {/* Mute / Unmute indicator */}
        {shouldPlay && (
          <View style={[localStyles.muteIconBase, mutePositionStyle]}>
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={14}
              color="white"
            />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

// ═══════════════════════════════════════════
// WEB COMPONENT — HTML5 <video>
// ═══════════════════════════════════════════
function WebVideoPlayer({
  source,
  style,
  shouldPlay = false,
  isLooping = false,
  isMuted = false,
  onToggleMute,
  posterUri,
  muteButtonPosition = "top-left",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoUri =
    typeof source === "number"
      ? (source as any)
      : typeof source === "object" && "uri" in source
      ? (source as any).uri
      : source;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (shouldPlay) {
      el.currentTime = 0;
      el.play().catch(() => {
        // Browsers may block unmuted autoplay — fallback to muted
        el.muted = true;
        el.play().catch(() => {});
      });
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [shouldPlay]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = isMuted;
  }, [isMuted]);

  const mutePositionStyle =
    muteButtonPosition === "top-left"
      ? localStyles.muteIconTopLeft
      : localStyles.muteIconBottomRight;

  return (
    <TouchableWithoutFeedback onPress={onToggleMute}>
      <View style={style}>
        {/* @ts-ignore */}
        <video
          ref={videoRef}
          src={videoUri}
          poster={posterUri}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover" as any,
            position: "absolute" as any,
            top: 0,
            left: 0,
          }}
          autoPlay={shouldPlay}
          loop={isLooping}
          muted={isMuted}
          playsInline
          preload="auto"
        />
        {shouldPlay && (
          <View style={[localStyles.muteIconBase, mutePositionStyle]}>
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={14}
              color="white"
            />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

// ═══════════════════════════════════════════
// EXPORTED COMPONENT
// ═══════════════════════════════════════════
function VideoPlayerSwitch(props: VideoPlayerProps) {
  if (Platform.OS === "web") {
    return <WebVideoPlayer {...props} />;
  }
  return <NativeVideoPlayer {...props} />;
}

export const VideoPlayer = memo(VideoPlayerSwitch);

// ═══════════════════════════════════════════
const localStyles = StyleSheet.create({
  muteIconBase: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  muteIconTopLeft: {
    top: 12,
    left: 12,
  },
  muteIconBottomRight: {
    bottom: 12,
    right: 12,
  },
});
