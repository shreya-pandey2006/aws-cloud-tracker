import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/member_model.dart';
import 'storage_service.dart';

class ApiService {
  static const Duration _timeout = Duration(seconds: 25);

  static Future<String> _getBaseUrl() async {
    final server = await StorageService.getServerUrl();
    return '$server/api';
  }

  static String _cleanErrorMessage(dynamic e) {
    if (e is SocketException || e.toString().contains('Failed host lookup') || e.toString().contains('errno = 7')) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    if (e is TimeoutException || e.toString().contains('TimeoutException')) {
      return 'Server is waking up or taking too long. Please try again in a few seconds.';
    }
    if (e is http.ClientException || e.toString().contains('ClientException')) {
      return 'Network connection interrupted. Please check your connection and retry.';
    }
    return e.toString().replaceAll('Exception:', '').trim();
  }

  static Future<bool> pingServer() async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/system/status');
      final res = await http.get(url).timeout(const Duration(seconds: 15));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? clubCode,
  }) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/auth/member/login');

      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email.trim(),
          'password': password.trim(),
          if (clubCode != null && clubCode.trim().isNotEmpty) 'clubCode': clubCode.trim(),
        }),
      ).timeout(_timeout);

      final data = jsonDecode(res.body);
      if (res.statusCode != 200) {
        throw Exception(data['error'] ?? 'Login failed');
      }

      final token = data['token'];
      final member = MemberModel.fromJson(data['user']);
      await StorageService.saveAuth(token, member);

      return {'token': token, 'member': member};
    } catch (e) {
      if (e is Exception && !e.toString().contains('SocketException') && !e.toString().contains('ClientException') && !e.toString().contains('TimeoutException')) {
        rethrow;
      }
      throw Exception(_cleanErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String newPassword,
    String? clubCode,
  }) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/auth/member/reset-password');

      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          if (clubCode != null && clubCode.trim().isNotEmpty) 'clubCode': clubCode.trim(),
          'email': email.trim(),
          'newPassword': newPassword,
        }),
      ).timeout(_timeout);

      final data = jsonDecode(res.body);
      if (res.statusCode != 200) {
        throw Exception(data['error'] ?? 'Password reset failed');
      }

      final token = data['token'];
      final member = MemberModel.fromJson(data['user']);
      await StorageService.saveAuth(token, member);

      return {
        'token': token,
        'member': member,
        'message': data['message'] ?? 'Password reset successfully',
      };
    } catch (e) {
      if (e is Exception && !e.toString().contains('SocketException') && !e.toString().contains('ClientException') && !e.toString().contains('TimeoutException')) {
        rethrow;
      }
      throw Exception(_cleanErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? clubCode,
    String? role,
    String? phone,
    String? emergencyContact,
  }) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/auth/member/register');

      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'clubCode': (clubCode != null && clubCode.trim().isNotEmpty) ? clubCode.trim() : 'AKGEC2026',
          'name': name.trim(),
          'role': (role != null && role.trim().isNotEmpty) ? role.trim() : 'Member',
          'email': email.trim(),
          'password': password.trim(),
          'phone': phone?.trim() ?? '',
          'emergencyContact': emergencyContact?.trim() ?? '',
        }),
      ).timeout(_timeout);

      final data = jsonDecode(res.body);
      if (res.statusCode != 201) {
        throw Exception(data['error'] ?? 'Registration failed');
      }

      final token = data['token'];
      final member = MemberModel.fromJson(data['user']);
      await StorageService.saveAuth(token, member);

      return {'token': token, 'member': member};
    } catch (e) {
      if (e is Exception && !e.toString().contains('SocketException') && !e.toString().contains('ClientException') && !e.toString().contains('TimeoutException')) {
        rethrow;
      }
      throw Exception(_cleanErrorMessage(e));
    }
  }

  static Future<void> toggleSharing(String memberId, bool enabled) async {
    try {
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
      ).timeout(_timeout);
    } catch (_) {
      // Ignore background sharing sync errors
    }
  }

  static Future<void> sendSos({
    required String memberId,
    required double latitude,
    required double longitude,
    String? message,
  }) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/alerts/sos');

    http.Response res;
    try {
      res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'memberId': memberId,
          'latitude': latitude,
          'longitude': longitude,
          'message': message ?? 'EMERGENCY SOS: Member requires immediate assistance!',
        }),
      ).timeout(const Duration(seconds: 15));
    } catch (e) {
      throw Exception(_cleanErrorMessage(e));
    }

    if (res.statusCode >= 400) {
      try {
        final data = jsonDecode(res.body);
        final errMsg = data['error'] ?? data['message'] ?? 'Failed to send SOS distress alert. Please try again.';
        throw Exception(errMsg);
      } catch (e) {
        if (e is Exception && !e.toString().contains('FormatException')) {
          rethrow;
        }
        throw Exception('Failed to send SOS distress alert. Please try again.');
      }
    }
  }

  static Future<void> sendLocationUpdate({
    required String memberId,
    required double latitude,
    required double longitude,
    double accuracy = 5.0,
    double speed = 0.0,
    double heading = 0.0,
    double altitude = 0.0,
    int battery = 100,
  }) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/members/$memberId/location');
      await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'latitude': latitude,
          'longitude': longitude,
          'accuracy': accuracy,
          'speed': speed,
          'heading': heading,
          'altitude': altitude,
          'battery': battery,
        }),
      ).timeout(const Duration(seconds: 10));
    } catch (_) {
      // Ignore background sync errors
    }
  }
}

