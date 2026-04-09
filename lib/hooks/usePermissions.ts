import { useEffect, useState } from "react";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";

interface PermissionStatus {
  location: boolean;
  camera: boolean;
  mediaLibrary: boolean;
  allGranted: boolean;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    location: false,
    camera: false,
    mediaLibrary: false,
    allGranted: false,
  });

  const requestAllPermissions = async () => {
    const [locationResult, cameraResult, mediaResult] = await Promise.all([
      Location.requestForegroundPermissionsAsync(),
      Camera.requestCameraPermissionsAsync(),
      ImagePicker.requestMediaLibraryPermissionsAsync(),
    ]);

    const status: PermissionStatus = {
      location: locationResult.status === "granted",
      camera: cameraResult.status === "granted",
      mediaLibrary: mediaResult.status === "granted",
      allGranted: false,
    };
    status.allGranted = status.location && status.camera && status.mediaLibrary;

    setPermissions(status);
    return status;
  };

  useEffect(() => {
    // Check current status on mount
    (async () => {
      const [locationResult, cameraResult, mediaResult] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Camera.getCameraPermissionsAsync(),
        ImagePicker.getMediaLibraryPermissionsAsync(),
      ]);

      const status: PermissionStatus = {
        location: locationResult.status === "granted",
        camera: cameraResult.status === "granted",
        mediaLibrary: mediaResult.status === "granted",
        allGranted: false,
      };
      status.allGranted =
        status.location && status.camera && status.mediaLibrary;

      setPermissions(status);
    })();
  }, []);

  return { permissions, requestAllPermissions };
}
