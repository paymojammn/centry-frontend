import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function proxyRequest(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}${path}${search}`;

  const headers = new Headers();
  // Forward relevant headers
  for (const [key, value] of request.headers.entries()) {
    if (['content-type', 'authorization', 'accept'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  const body = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : await request.text();

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const data = await response.text();

  return new NextResponse(data, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
