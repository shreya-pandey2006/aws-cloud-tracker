import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import 'storage_service.dart';

class SocketService {
  static socket_io.Socket? _socket;
  static bool get isConnected => _socket?.connected ?? false;

  static Future<void> connect({
    required String clubId,
    required String memberId,
    Function()? onConnected,
    Function(dynamic)? onAlert,
  }) async {
    disconnect();

    final serverUrl = await StorageService.getServerUrl();

    _socket = socket_io.io(
      serverUrl,
      socket_io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('📡 Connected to Club Live Socket Gateway: ${_socket!.id}');
      _socket!.emit('join', {
        'clubId': clubId,
        'memberId': memberId,
        'role': 'member',
      });
      if (onConnected != null) onConnected();
    });

    _socket!.onDisconnect((reason) {
      debugPrint('⚠️ Disconnected from socket: $reason');
    });

    if (onAlert != null) {
      _socket!.on('alert:new', onAlert);
      _socket!.on('alert:sos', onAlert);
    }
  }

  static void sendLocationUpdate({
    required String memberId,
    required String clubId,
    required double latitude,
    required double longitude,
    double accuracy = 5.0,
    double speed = 0.0,
    double heading = 0.0,
    double altitude = 0.0,
    int battery = 100,
  }) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('location:update', {
        'memberId': memberId,
        'clubId': clubId,
        'latitude': latitude,
        'longitude': longitude,
        'accuracy': accuracy,
        'speed': speed,
        'heading': heading,
        'altitude': altitude,
        'battery': battery,
        'timestamp': DateTime.now().toIso8601String(),
      });
    }
  }

  static void toggleLocationSharing({
    required String memberId,
    required String clubId,
    required bool enabled,
  }) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('location:toggle', {
        'memberId': memberId,
        'clubId': clubId,
        'enabled': enabled,
      });
    }
  }

  static void triggerSos({
    required String memberId,
    required String clubId,
    required double latitude,
    required double longitude,
    String? message,
  }) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('member:sos', {
        'memberId': memberId,
        'clubId': clubId,
        'latitude': latitude,
        'longitude': longitude,
        'message': message ?? 'EMERGENCY SOS triggered by member!',
      });
    }
  }

  static void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
    }
  }
}
