class MemberModel {
  final String id;
  final String clubId;
  final String clubName;
  final String clubCode;
  final String name;
  final String email;
  final String? phone;
  final String? emergencyContact;
  final String role;
  final String status;
  final bool isSharingLocation;
  final double? lastLatitude;
  final double? lastLongitude;
  final double? lastAccuracy;
  final double? lastSpeed;
  final double? lastHeading;
  final int? lastBattery;
  final String? lastSeenAt;

  MemberModel({
    required this.id,
    required this.clubId,
    required this.clubName,
    required this.clubCode,
    required this.name,
    required this.email,
    this.phone,
    this.emergencyContact,
    required this.role,
    required this.status,
    required this.isSharingLocation,
    this.lastLatitude,
    this.lastLongitude,
    this.lastAccuracy,
    this.lastSpeed,
    this.lastHeading,
    this.lastBattery,
    this.lastSeenAt,
  });

  factory MemberModel.fromJson(Map<String, dynamic> json) {
    return MemberModel(
      id: json['id'] ?? '',
      clubId: json['club_id'] ?? json['clubId'] ?? '',
      clubName: json['club_name'] ?? json['clubName'] ?? 'AWS Cloud Clubs of Ajay Kumar Garg Engineering College',
      clubCode: json['club_code'] ?? json['clubCode'] ?? 'AKGEC2026',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      emergencyContact: json['emergency_contact'] ?? json['emergencyContact'],
      role: json['role'] ?? 'member',
      status: json['status'] ?? 'offline',
      isSharingLocation: json['is_sharing_location'] == 1 || json['is_sharing_location'] == true,
      lastLatitude: json['last_latitude'] != null ? (json['last_latitude'] as num).toDouble() : null,
      lastLongitude: json['last_longitude'] != null ? (json['last_longitude'] as num).toDouble() : null,
      lastAccuracy: json['last_accuracy'] != null ? (json['last_accuracy'] as num).toDouble() : null,
      lastSpeed: json['last_speed'] != null ? (json['last_speed'] as num).toDouble() : null,
      lastHeading: json['last_heading'] != null ? (json['last_heading'] as num).toDouble() : null,
      lastBattery: json['last_battery'] != null ? (json['last_battery'] as num).toInt() : null,
      lastSeenAt: json['last_seen_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'club_id': clubId,
      'club_name': clubName,
      'club_code': clubCode,
      'name': name,
      'email': email,
      'phone': phone,
      'emergency_contact': emergencyContact,
      'role': role,
      'status': status,
      'is_sharing_location': isSharingLocation ? 1 : 0,
      'last_latitude': lastLatitude,
      'last_longitude': lastLongitude,
      'last_accuracy': lastAccuracy,
      'last_speed': lastSpeed,
      'last_heading': lastHeading,
      'last_battery': lastBattery,
      'last_seen_at': lastSeenAt,
    };
  }

  MemberModel copyWith({
    bool? isSharingLocation,
    String? status,
    double? lastLatitude,
    double? lastLongitude,
    double? lastAccuracy,
    double? lastSpeed,
    double? lastHeading,
    int? lastBattery,
    String? lastSeenAt,
  }) {
    return MemberModel(
      id: id,
      clubId: clubId,
      clubName: clubName,
      clubCode: clubCode,
      name: name,
      email: email,
      phone: phone,
      emergencyContact: emergencyContact,
      role: role,
      status: status ?? this.status,
      isSharingLocation: isSharingLocation ?? this.isSharingLocation,
      lastLatitude: lastLatitude ?? this.lastLatitude,
      lastLongitude: lastLongitude ?? this.lastLongitude,
      lastAccuracy: lastAccuracy ?? this.lastAccuracy,
      lastSpeed: lastSpeed ?? this.lastSpeed,
      lastHeading: lastHeading ?? this.lastHeading,
      lastBattery: lastBattery ?? this.lastBattery,
      lastSeenAt: lastSeenAt ?? this.lastSeenAt,
    );
  }
}

