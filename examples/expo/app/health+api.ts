// Keep this endpoint independent of UI modules so readiness never renders a
// page or registers its React Native Web styles before the cold-render test.
export function GET() {
  return Response.json(
    {status: 'ok'},
    {headers: {'Cache-Control': 'no-store'}},
  );
}
