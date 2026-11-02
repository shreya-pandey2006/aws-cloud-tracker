import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/member_model.dart';
import 'storage_service.dart';

class ApiService {
  static Future<String> _getBaseUrl() async {
    final server = await StorageService.getServerUrl();
    return '$server/api';
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? clubCode,
  }) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/auth/member/login');

    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email.trim(),
        'password': password.trim(),
        if (clubCode != null && clubCode.isNotEmpty) 'clubCode': clubCode.trim(),
      }),
    );

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Login failed');
    }

    final token = data['token'];
    final member = MemberModel.fromJson(data['user']);
    await StorageService.saveAuth(token, member);

    return {'token': token, 'member': member};
  }

  static Future<Map<String, dynamic>> register({
    required String clubCode,
    required String name,
    required String email,
    required String password,
    String? phone,
    String? emergencyContact,
  }) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/auth/member/register');

    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'clubCode': clubCode.trim(),
        'name': name.trim(),
        'email': email.trim(),
        'password': password.trim(),
        'phone': phone?.trim() ?? '',
        'emergencyContact': emergencyContact?.trim() ?? '',
      }),
    );

    final data = jsonDecode(res.body);
    if (res.statusCode != 201) {
      throw Exception(data['error'] ?? 'Registration failed');
    }

    final token = data['token'];
    final member = MemberModel.fromJson(data['user']);
    await StorageService.saveAuth(token, member);

    return {'token': token, 'member': member};
  }

  static Future<void> toggleSharing(String memberId, bool enabled) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/members/$memberId/sharing');

    final token = await StorageService.getToken();
    await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'enabled': enabled}),
    );
  }

  static Future<void> sendSos({
    required String memberId,
    required double latitude,
    required double longitude,
    String? message,
  }) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/alerts/sos');

    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'memberId': memberId,
        'latitude': latitude,
        'longitude': longitude,
        'message': message ?? 'EMERGENCY SOS: Member requires immediate assistance!',
      }),
    );

    if (res.statusCode >= 400) {
      try {
        final data = jsonDecode(res.body);
        final errMsg = data['error'] ?? data['message'] ?? 'You cannot send the SOS as you are no longer a member of this club.';
        throw Exception(errMsg);
      } catch (e) {
        if (e is Exception && !e.toString().contains('FormatException')) {
          rethrow;
        }
        throw Exception('You cannot send the SOS as you are no longer a member of this club.');
      }
    }
  }
}

