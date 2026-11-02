import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../models/member_model.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../services/socket_service.dart';
import '../services/storage_service.dart';
import 'profile_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  final MemberModel member;

  const HomeScreen({super.key, required this.member});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late MemberModel _member;
  bool _isSharing = false;
  Position? _currentPosition;
  final MapController _mapController = MapController();
  Timer? _periodicTimer;
  bool _isSosLoading = false;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _member = widget.member;
    _isSharing = _member.isSharingLocation;

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _initSocketAndLocation();
  }

  @override
  void dispose() {
    _periodicTimer?.cancel();
    _pulseController.dispose();
    LocationService.stopTracking();
    SocketService.disconnect();
    super.dispose();
  }

  Future<void> _handleRevokedMembership([String? message]) async {
    await StorageService.clear();
    LocationService.stopTracking();
    SocketService.disconnect();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message ?? 'You cannot send the SOS as you are no longer a member of this club.',
          style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
        ),
        backgroundColor: const Color(0xFFEF4444),
        duration: const Duration(seconds: 5),
      ),
    );
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  Future<void> _initSocketAndLocation() async {
    // 1. Connect to WebSockets
    await SocketService.connect(
      clubId: _member.clubId,
      memberId: _member.id,
      onConnected: () {
        if (mounted) setState(() {});
      },
      onRevoked: (msg) => _handleRevokedMembership(msg),
    );

    // 2. Initial position
    final pos = await LocationService.getCurrentPosition();
    if (mounted && pos != null) {
      setState(() {
        _currentPosition = pos;
      });
      _mapController.move(LatLng(pos.latitude, pos.longitude), 15.0);
    }

    // 3. If sharing was already on, resume tracking
    if (_isSharing) {
      _startLiveSharing();
    }
  }

  void _startLiveSharing() {
    LocationService.startTracking(
      onLocationUpdate: (Position pos) {
        if (!mounted) return;
        setState(() {
          _currentPosition = pos;
        });

        SocketService.sendLocationUpdate(
          memberId: _member.id,
          clubId: _member.clubId,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          speed: (pos.speed * 3.6),
          heading: pos.heading,
          altitude: pos.altitude,
          battery: 88,
        );
      },
    );

    _periodicTimer?.cancel();
    _periodicTimer = Timer.periodic(const Duration(seconds: 4), (timer) async {
      if (!_isSharing) {
        timer.cancel();
        return;
      }
      final pos = await LocationService.getCurrentPosition();
      if (pos != null && mounted) {
        setState(() {
          _currentPosition = pos;
        });
        SocketService.sendLocationUpdate(
          memberId: _member.id,
          clubId: _member.clubId,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          speed: (pos.speed * 3.6),
          heading: pos.heading,
          altitude: pos.altitude,
          battery: 88,
        );
      }
    });
  }

  void _stopLiveSharing() {
    _periodicTimer?.cancel();
    LocationService.stopTracking();
  }

  Future<void> _toggleSharing(bool value) async {
    setState(() {
      _isSharing = value;
      _member = _member.copyWith(isSharingLocation: value);
    });

    await StorageService.saveMember(_member);

    SocketService.toggleLocationSharing(
      memberId: _member.id,
      clubId: _member.clubId,
      enabled: value,
    );
    ApiService.toggleSharing(_member.id, value);

    if (value) {
      _startLiveSharing();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🟢 Live location sharing enabled with Club Admin'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } else {
      _stopLiveSharing();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⏸️ Location sharing stopped (Privacy protected)'),
            backgroundColor: Color(0xFFF59E0B),
          ),
        );
      }
    }
  }

  void _handleSosPrompt() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning, color: Color(0xFFEF4444), size: 24),
            SizedBox(width: 10),
            Text('Trigger Emergency SOS?', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
        content: const Text(
          'This will immediately transmit an emergency distress alert with your exact GPS location to the Club Coordinator and sound an audible alarm at Club HQ.',
          style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () {
              Navigator.pop(ctx);
              _triggerSos();
            },
            child: const Text('YES, SEND SOS NOW', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Future<void> _triggerSos() async {
    setState(() {
      _isSosLoading = true;
    });

    final pos = _currentPosition ?? await LocationService.getCurrentPosition();
    final lat = pos?.latitude ?? 28.6757;
    final lng = pos?.longitude ?? 77.5020;

    final sosMsg = 'EMERGENCY SOS: Member ${_member.name} pressed panic distress button!';

    try {
      // 1. Send via WebSocket if connected for instantaneous dashboard dispatch
      if (SocketService.isConnected) {
        SocketService.triggerSos(
          memberId: _member.id,
          clubId: _member.clubId,
          latitude: lat,
          longitude: lng,
          message: sosMsg,
        );
      }

      // 2. Also record via REST API (validates membership in database)
      await ApiService.sendSos(
        memberId: _member.id,
        latitude: lat,
        longitude: lng,
        message: sosMsg,
      );

      if (mounted) {
        setState(() {
          _isSosLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🚨 SOS DISTRESS TRANSMITTED TO CLUB ADMIN!'),
            backgroundColor: Color(0xFFEF4444),
            duration: Duration(seconds: 5),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSosLoading = false;
        });
      }
      final errStr = e.toString().replaceAll('Exception:', '').trim();
      final isRevoked = errStr.toLowerCase().contains('no longer a member') ||
                        errStr.toLowerCase().contains('not found') ||
                        errStr.contains('404') ||
                        errStr.toLowerCase().contains('revoked');

      if (isRevoked) {
        await _handleRevokedMembership('You cannot send the SOS as you are no longer a member of this club.');
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('⚠️ $errStr'),
              backgroundColor: const Color(0xFFEF4444),
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final lat = _currentPosition?.latitude ?? _member.lastLatitude ?? 28.6757;
    final lng = _currentPosition?.longitude ?? _member.lastLongitude ?? 77.5020;
    final speed = _currentPosition != null ? (_currentPosition!.speed * 3.6) : (_member.lastSpeed ?? 0.0);
    final accuracy = _currentPosition?.accuracy ?? _member.lastAccuracy ?? 5.0;

    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        toolbarHeight: 68,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'AWS Cloud Clubs',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 1),
            const Text(
              'Ajay Kumar Garg Engineering College',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Color(0xFF94A3B8),
              ),
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: SocketService.isConnected ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  SocketService.isConnected ? 'Connected to HQ Gateway' : 'Connecting...',
                  style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person, color: Colors.white),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => ProfileScreen(member: _member)),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Prominent Consent & Status Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: _isSharing
                    ? const LinearGradient(
                        colors: [Color(0xFF064E3B), Color(0xFF065F46)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : const LinearGradient(
                        colors: [Color(0xFF1F2937), Color(0xFF111827)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: _isSharing ? const Color(0xFF10B981) : const Color(0xFF374151),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: _isSharing
                        ? const Color(0xFF10B981).withValues(alpha: 0.2)
                        : Colors.black.withValues(alpha: 0.2),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          if (_isSharing)
                            ScaleTransition(
                              scale: _pulseAnimation,
                              child: Container(
                                width: 14,
                                height: 14,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF34D399),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            )
                          else
                            Container(
                              width: 12,
                              height: 12,
                              decoration: const BoxDecoration(
                                color: Color(0xFF94A3B8),
                                shape: BoxShape.circle,
                              ),
                            ),
                          const SizedBox(width: 10),
                          Text(
                            _isSharing ? 'LIVE SHARING ACTIVE' : 'SHARING PAUSED',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: _isSharing ? const Color(0xFF34D399) : const Color(0xFF94A3B8),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      Switch(
                        value: _isSharing,
                        onChanged: _toggleSharing,
                        activeThumbColor: const Color(0xFF10B981),
                        activeTrackColor: const Color(0xFF047857),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _isSharing
                        ? 'Your real-time GPS coordinates are being transmitted securely to the Club Admin live dashboard.'
                        : 'Your location is completely private. Club administrators cannot see your position until you enable sharing.',
                    style: TextStyle(
                      fontSize: 12,
                      color: _isSharing ? const Color(0xFFD1FAE5) : const Color(0xFF94A3B8),
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Live GPS Telemetry Grid
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Live GPS Telemetry',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFFF8FAFC)),
                      ),
                      Icon(Icons.satellite_alt, color: Color(0xFF38BDF8), size: 16),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(child: _buildTelemetryCell('LATITUDE', lat.toStringAsFixed(5), Icons.explore)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildTelemetryCell('LONGITUDE', lng.toStringAsFixed(5), Icons.explore)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: _buildTelemetryCell('SPEED', '${speed.toStringAsFixed(1)} km/h', Icons.speed)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildTelemetryCell('ACCURACY', '±${accuracy.toStringAsFixed(1)} m', Icons.gps_fixed)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // OpenStreetMap Interactive Mini-Map
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                height: 240,
                width: double.infinity,
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF1E293B)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Stack(
                  children: [
                    FlutterMap(
                      mapController: _mapController,
                      options: MapOptions(
                        initialCenter: LatLng(lat, lng),
                        initialZoom: 15.0,
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.clubtracker.member_app',
                        ),
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: LatLng(lat, lng),
                              width: 50,
                              height: 50,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: _isSharing ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2.5),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.4),
                                      blurRadius: 8,
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: Text(
                                    _member.name.isNotEmpty ? _member.name[0].toUpperCase() : 'M',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),

                    Positioned(
                      bottom: 12,
                      right: 12,
                      child: FloatingActionButton.small(
                        backgroundColor: const Color(0xFF0F172A),
                        onPressed: () {
                          _mapController.move(LatLng(lat, lng), 16.0);
                        },
                        child: const Icon(Icons.my_location, color: Color(0xFF38BDF8), size: 18),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Big Emergency SOS Button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  elevation: 6,
                  shadowColor: const Color(0xFFEF4444).withValues(alpha: 0.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _isSosLoading ? null : _handleSosPrompt,
                icon: const Icon(Icons.emergency, color: Colors.white, size: 24),
                label: _isSosLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        'EMERGENCY SOS DISTRESS',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: 0.5,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTelemetryCell(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0B0F19),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF64748B), size: 16),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 9, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFFE2E8F0))),
            ],
          ),
        ],
      ),
    );
  }
}
