import 'package:flutter/material.dart';
import '../models/member_model.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isRegisterMode = false;
  bool _isPasswordVisible = false;

  final _nameController = TextEditingController();
  final _roleController = TextEditingController(text: 'Member');
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emergencyController = TextEditingController();
  final _passwordController = TextEditingController();
  final _clubCodeController = TextEditingController(text: 'AKGEC2026');

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _roleController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _emergencyController.dispose();
    _passwordController.dispose();
    _clubCodeController.dispose();
    super.dispose();
  }

  Future<void> _handleAuth() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final clubCode = _clubCodeController.text.trim();
    final name = _nameController.text.trim();
    final role = _roleController.text.trim();
    final phone = _phoneController.text.trim();
    final emergency = _emergencyController.text.trim();

    // 1. Club Passcode validation
    if (clubCode.isEmpty) {
      setState(() => _errorMessage = 'Please enter your Club Passcode (e.g. AKGEC2026).');
      return;
    }
    if (clubCode.length < 3) {
      setState(() => _errorMessage = 'Club Passcode must be at least 3 characters.');
      return;
    }
    if (clubCode.length > 30) {
      setState(() => _errorMessage = 'Club Passcode cannot exceed 30 characters.');
      return;
    }

    // 2. Register-specific field validation
    if (_isRegisterMode) {
      if (name.isEmpty) {
        setState(() => _errorMessage = 'Please enter your Full Name.');
        return;
      }
      if (name.length < 2) {
        setState(() => _errorMessage = 'Full Name must be at least 2 characters.');
        return;
      }
      if (name.length > 60) {
        setState(() => _errorMessage = 'Full Name cannot exceed 60 characters.');
        return;
      }
      if (!RegExp(r"^[a-zA-Z\s.'-]+$").hasMatch(name)) {
        setState(() => _errorMessage = 'Full Name should only contain letters and spaces.');
        return;
      }

      if (role.isNotEmpty && role.length > 50) {
        setState(() => _errorMessage = 'Club Role cannot exceed 50 characters.');
        return;
      }

      // Phone format validation (optional, but validated if provided)
      if (phone.isNotEmpty) {
        final phoneRegExp = RegExp(r'^\+?[0-9\s-]{10,15}$');
        if (!phoneRegExp.hasMatch(phone)) {
          setState(() => _errorMessage = 'Please enter a valid 10-15 digit phone number.');
          return;
        }
      }

      // Emergency contact validation (optional, but validated if provided)
      if (emergency.isNotEmpty) {
        final phoneRegExp = RegExp(r'^\+?[0-9\s-]{10,15}$');
        if (!phoneRegExp.hasMatch(emergency)) {
          setState(() => _errorMessage = 'Please enter a valid 10-15 digit emergency contact number.');
          return;
        }
        final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
        final cleanEmergency = emergency.replaceAll(RegExp(r'\D'), '');
        if (cleanPhone.isNotEmpty && cleanEmergency == cleanPhone) {
          setState(() => _errorMessage = 'Emergency contact must be different from your own phone number.');
          return;
        }
      }
    }

    // 3. Email validation
    if (email.isEmpty) {
      setState(() => _errorMessage = 'Please enter your email address.');
      return;
    }
    final emailRegExp = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    if (!emailRegExp.hasMatch(email)) {
      setState(() => _errorMessage = 'Please enter a valid email address (e.g. name@akgec.ac.in).');
      return;
    }
    if (email.length > 100) {
      setState(() => _errorMessage = 'Email address cannot exceed 100 characters.');
      return;
    }

    // 4. Password validation
    if (password.isEmpty) {
      setState(() => _errorMessage = 'Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setState(() => _errorMessage = 'Password must be at least 6 characters long.');
      return;
    }
    if (password.length > 100) {
      setState(() => _errorMessage = 'Password cannot exceed 100 characters.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      Map<String, dynamic> result;
      if (_isRegisterMode) {
        result = await ApiService.register(
          clubCode: clubCode,
          name: name,
          role: role.isNotEmpty ? role : 'Member',
          email: email,
          password: password,
          phone: phone,
          emergencyContact: emergency,
        );
      } else {
        result = await ApiService.login(
          email: email,
          password: password,
          clubCode: clubCode,
        );
      }

      final MemberModel member = result['member'];

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => HomeScreen(member: member)),
      );
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 12),

                // Logo & Header
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF38BDF8), Color(0xFF2563EB)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.35),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.location_on, color: Colors.white, size: 34),
                ),
                const SizedBox(height: 16),
                const Text(
                  'AWS Cloud Clubs',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Ajay Kumar Garg Engineering College',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF38BDF8)),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Real-Time Member Tracking & Safety Dispatch',
                  style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
                const SizedBox(height: 24),

                // Auth Mode Switcher (Sign In vs Register)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _isRegisterMode = false;
                              _errorMessage = null;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: !_isRegisterMode ? const Color(0xFF2563EB) : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Center(
                              child: Text(
                                'Sign In',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: !_isRegisterMode ? Colors.white : const Color(0xFF94A3B8),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _isRegisterMode = true;
                              _errorMessage = null;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _isRegisterMode ? const Color(0xFF2563EB) : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Center(
                              child: Text(
                                'New Register',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _isRegisterMode ? Colors.white : const Color(0xFF94A3B8),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // Error Message
                if (_errorMessage != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                      border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
                    ),
                  ),

                // Form Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF111827),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF1E293B)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Club Passcode
                      const Text(
                        'Club Passcode',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1)),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _clubCodeController,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.vpn_key, color: Color(0xFF64748B), size: 18),
                          filled: true,
                          fillColor: const Color(0xFF0F172A),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF334155)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF334155)),
                          ),
                          hintText: 'AKGEC2026',
                          hintStyle: const TextStyle(color: Color(0xFF475569)),
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // If Register Mode, Full Name & Club Role
                      if (_isRegisterMode) ...[
                        const Text(
                          'Full Name',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1)),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _nameController,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.person, color: Color(0xFF64748B), size: 18),
                            filled: true,
                            fillColor: const Color(0xFF0F172A),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFF334155)),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFF334155)),
                            ),
                            hintText: 'e.g. Rahul Sharma',
                            hintStyle: const TextStyle(color: Color(0xFF475569)),
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 14),

                        const Text(
                          'Club Role / Designation',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1)),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _roleController,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.badge_outlined, color: Color(0xFF64748B), size: 18),
                            filled: true,
                            fillColor: const Color(0xFF0F172A),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFF334155)),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFF334155)),
                            ),
                            hintText: 'e.g. Cloud Lead, Core Team, Member',
                            hintStyle: const TextStyle(color: Color(0xFF475569)),
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Email
                      const Text(
                        'Email Address',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1)),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.mail, color: Color(0xFF64748B), size: 18),
                          filled: true,
                          fillColor: const Color(0xFF0F172A),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF334155)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF334155)),
                          ),
                          hintText: 'student@akgec.ac.in',
                          hintStyle: const TextStyle(color: Color(0xFF475569)),
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // If Register Mode, Phone & Emergency
                      if (_isRegisterMode) ...[
                        const Text(
                          'Phone Number',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1)),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.phone, color: Color(0xFF64748B), size: 18),
                            filled: true,
                            fillColor: const Color(0xFF0F172A),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFF334155)),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFF334155)),
                            ),
                            hintText: '+91 98765 43210',
                            hintStyle: const TextStyle(color: Color(0xFF475569)),
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 14),

                        const Text(
                          'Emergency Contact (Optional)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1)),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _emergencyController,
                          keyboardType: TextInputType.phone,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.emergency, color: Color(0xFF64748B), size: 18),
                            filled: true,
                            fillColor: const Color(0xFF0F172A),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFF334155)),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFF334155)),
                            ),
                            hintText: '+91 91234 56789',
                            hintStyle: const TextStyle(color: Color(0xFF475569)),
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Password
                      const Text(
                        'Password',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1)),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _passwordController,
                        obscureText: !_isPasswordVisible,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.lock, color: Color(0xFF64748B), size: 18),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _isPasswordVisible ? Icons.visibility : Icons.visibility_off,
                              color: const Color(0xFF64748B),
                              size: 20,
                            ),
                            onPressed: () {
                              setState(() {
                                _isPasswordVisible = !_isPasswordVisible;
                              });
                            },
                            tooltip: _isPasswordVisible ? 'Hide password' : 'Show password',
                          ),
                          filled: true,
                          fillColor: const Color(0xFF0F172A),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF334155)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF334155)),
                          ),
                          hintText: '••••••••',
                          hintStyle: const TextStyle(color: Color(0xFF475569)),
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 22),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isRegisterMode ? const Color(0xFF2563EB) : const Color(0xFF10B981),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 4,
                          ),
                          onPressed: _isLoading ? null : _handleAuth,
                          child: _isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                )
                              : Text(
                                  _isRegisterMode ? 'Register & Start Tracking' : 'Sign In & Start Tracking',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
