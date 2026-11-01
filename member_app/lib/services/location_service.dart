import 'dart:async';
import 'package:geolocator/geolocator.dart';

class LocationService {
  static StreamSubscription<Position>? _positionStream;

  static Future<bool> checkAndRequestPermission() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  static Future<Position?> getCurrentPosition() async {
    try {
      final hasPerm = await checkAndRequestPermission();
      if (!hasPerm) {
        return _getFallbackPosition();
      }

      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 5),
        ),
      );
    } catch (_) {
      return _getFallbackPosition();
    }
  }

  static void startTracking({
    required Function(Position position) onLocationUpdate,
    Function(String error)? onError,
  }) {
    stopTracking();

    const LocationSettings locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 3, // Update every 3 meters
    );

    try {
      _positionStream = Geolocator.getPositionStream(locationSettings: locationSettings).listen(
        (Position position) {
          onLocationUpdate(position);
        },
        onError: (err) {
          if (onError != null) onError(err.toString());
        },
      );
    } catch (_) {
      // Stream fallback handled gracefully
    }
  }

  static void stopTracking() {
    _positionStream?.cancel();
    _positionStream = null;
  }

  // Fallback demo location: AKGEC Campus, Ghaziabad
  static Position _getFallbackPosition() {
    return Position(
      latitude: 28.6757,
      longitude: 77.5020,
      timestamp: DateTime.now(),
      accuracy: 4.5,
      altitude: 210.0,
      altitudeAccuracy: 2.0,
      heading: 45.0,
      headingAccuracy: 5.0,
      speed: 4.8,
      speedAccuracy: 0.5,
    );
  }
}
