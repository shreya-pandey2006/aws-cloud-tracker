import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/member_model.dart';

class StorageService {
  static const String _keyToken = 'auth_token';
  static const String _keyMember = 'member_profile';
  static const String _keyServerUrl = 'server_url';
  static const String defaultServerUrl = 'https://aws-cloud-tracker.onrender.com';

  static Future<void> saveAuth(String token, MemberModel member) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, token);
    await prefs.setString(_keyMember, jsonEncode(member.toJson()));
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyToken);
  }

  static Future<MemberModel?> getMember() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_keyMember);
    if (jsonStr == null) return null;
    try {
      final map = jsonDecode(jsonStr);
      return MemberModel.fromJson(map);
    } catch (e) {
      return null;
    }
  }

  static Future<void> saveMember(MemberModel member) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyMember, jsonEncode(member.toJson()));
  }

  static Future<String> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyServerUrl) ?? defaultServerUrl;
  }

  static Future<void> setServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyServerUrl, url);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyMember);
  }
}
