// Native version: try to import react-native-maps
let RNMapView: any = null;
let RNMarker: any = null;
let RNCallout: any = null;

try {
  const RNMaps = require("react-native-maps");
  RNMapView = RNMaps.default;
  RNMarker = RNMaps.Marker;
  RNCallout = RNMaps.Callout;
} catch (e) {
  // react-native-maps not available (e.g. in Expo Go without native build)
  RNMapView = null;
}

export { RNMapView, RNMarker, RNCallout };
