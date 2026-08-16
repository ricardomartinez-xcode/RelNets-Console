export async function GET(): Promise<Response> {
  return new Response(null, {
    status: 308,
    headers: { Location: 'https://relead.com.mx' },
  });
}
