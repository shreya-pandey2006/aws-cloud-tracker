import 'package:flutter_test/flutter_test.dart';
import 'package:member_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ClubTrackerApp());
    expect(find.text('AWS Cloud Clubs'), findsOneWidget);
  });
}
