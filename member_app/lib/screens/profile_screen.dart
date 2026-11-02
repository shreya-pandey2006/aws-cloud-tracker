import 'package:flutter/material.dart';
import '../models/member_model.dart';
import '../services/storage_service.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  final MemberModel member;

  const ProfileScreen({super.key, required this.member});

  Future<void> _handleLogout(BuildContext context) async {
    await StorageService.clear();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text('Member Profile', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // User Avatar Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: const Color(0xFF10B981),
                    child: Text(
                      member.name.isNotEmpty ? member.name[0].toUpperCase() : 'M',
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          member.name,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          member.role,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF10B981), fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          member.email,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Club Details
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                children: [
                  _buildInfoRow('Club Name', member.clubName, Icons.groups),
                  const Divider(color: Color(0xFF1E293B)),
                  _buildInfoRow('Club Role', member.role, Icons.badge_outlined),
                  const Divider(color: Color(0xFF1E293B)),
                  _buildInfoRow('Phone', member.phone ?? 'Not registered', Icons.phone),
                  const Divider(color: Color(0xFF1E293B)),
                  _buildInfoRow('Emergency Contact', member.emergencyContact ?? 'None registered', Icons.contact_emergency),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Privacy & Consent Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.privacy_tip, color: Color(0xFF38BDF8), size: 22),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Privacy & Security Guarantee',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFFF8FAFC)),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Your location is only transmitted to authorized club administrators when you explicitly turn on "Share My Location". You can stop sharing at any time with a single tap.',
                          style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFEF4444)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () => _handleLogout(context),
                icon: const Icon(Icons.logout, color: Color(0xFFEF4444), size: 18),
                label: const Text('Log Out of Club App', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, color: const Color(0xFF64748B), size: 18),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8))),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}
