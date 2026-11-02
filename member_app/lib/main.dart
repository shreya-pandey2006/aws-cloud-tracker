import 'package:flutter/material.dart';
import 'models/member_model.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'services/storage_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final token = await StorageService.getToken();
  final member = await StorageService.getMember();

  runApp(ClubTrackerApp(
    initialMember: (token != null && member != null) ? member : null,
  ));
}

class ClubTrackerApp extends StatelessWidget {
  final MemberModel? initialMember;

  const ClubTrackerApp({super.key, this.initialMember});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AWS Tracker',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        primaryColor: const Color(0xFF10B981),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF10B981),
          secondary: Color(0xFF38BDF8),
          surface: Color(0xFF111827),
          error: Color(0xFFEF4444),
        ),
        useMaterial3: true,
      ),
      home: initialMember != null ? HomeScreen(member: initialMember!) : const LoginScreen(),
    );
  }
}
